const pool = require('../db');
const { calculateInvoiceMath } = require('../services/billingService');

function computeAllowedActions(status, plan) {
  const actions = [];
  switch (status) {
    case 'Draft':
      actions.push('quote');
      break;
    case 'Quotation':
      actions.push('confirm');
      break;
    case 'Confirmed':
      actions.push('activate');
      break;
    case 'Active':
      if (plan.pausable) actions.push('pause');
      if (plan.closable) actions.push('close');
      break;
    case 'Paused':
      actions.push('resume');
      if (plan.closable) actions.push('close');
      break;
    case 'Closed':
      if (plan.renewable) actions.push('renew');
      break;
  }
  return actions;
}

// GET /api/subscriptions
async function listSubscriptions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 10, 10)));
    const offset = (page - 1) * pageSize;

    const { status, customer, customerId, plan, planId, search } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`LOWER(s.status) = LOWER($${params.length})`);
    }

    const effectiveCustomerId = customerId || customer;
    if (effectiveCustomerId) {
      params.push(effectiveCustomerId);
      conditions.push(`s.customer_id = $${params.length}`);
    }

    const effectivePlanId = planId || plan;
    if (effectivePlanId) {
      params.push(effectivePlanId);
      conditions.push(`s.plan_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(s.number ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT s.id)::int AS total
      FROM subscriptions s
      JOIN users u ON u.id = s.customer_id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(pageSize, offset);
    const dataQuery = `
      SELECT s.id,
             s.number,
             s.customer_id AS "customerId",
             u.name AS "customerName",
             s.plan_id AS "planId",
             p.name AS "planName",
             s.status,
             s.start_date AS "startDate",
             s.expiry_date AS "expiryDate",
             s.next_billing_date AS "nextBillingDate",
             s.start_date,
             s.expiry_date,
             s.next_billing_date,
             COALESCE(SUM(sl.qty * sl.unit_price), 0)::numeric(12,2) AS amount
      FROM subscriptions s
      JOIN users u ON u.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
      LEFT JOIN subscription_lines sl ON sl.subscription_id = s.id
      ${whereClause}
      GROUP BY s.id, u.name, p.name
      ORDER BY s.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataRes = await pool.query(dataQuery, params);
    const formatted = dataRes.rows.map((r) => ({
      ...r,
      subscriptionNumber: r.number,
      amount: parseFloat(r.amount),
    }));

    res.json({
      data: formatted,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/subscriptions/:id
async function getSubscriptionById(req, res, next) {
  try {
    const { id } = req.params;

    const subQuery = `
      SELECT s.id,
             s.number,
             s.customer_id,
             u.name AS customer_name,
             u.email AS customer_email,
             s.plan_id,
             p.name AS plan_name,
             p.price AS plan_price,
             p.period AS plan_period,
             p.min_qty AS plan_min_qty,
             p.auto_close,
             p.closable,
             p.pausable,
             p.renewable,
             s.start_date,
             s.expiry_date,
             s.payment_terms,
             s.status,
             s.next_billing_date,
             s.created_at
      FROM subscriptions s
      JOIN users u ON u.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
      WHERE s.id::text = $1 OR s.number = $1
    `;

    const subResult = await pool.query(subQuery, [id]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subResult.rows[0];

    const planObj = {
      id: sub.plan_id,
      name: sub.plan_name,
      price: parseFloat(sub.plan_price),
      period: sub.plan_period,
      minQty: sub.plan_min_qty,
      autoClose: sub.auto_close,
      closable: sub.closable,
      pausable: sub.pausable,
      renewable: sub.renewable,
      auto_close: sub.auto_close,
    };

    // Lines
    const linesQuery = `
      SELECT sl.id, sl.product_id, sl.variant_id, sl.qty, sl.unit_price,
             p.name AS product_name, pv.attribute AS variant_attribute, pv.value AS variant_value,
             COALESCE(t.rate, 0) AS tax_rate,
             (sl.qty * sl.unit_price)::numeric(12,2) AS amount
      FROM subscription_lines sl
      JOIN products p ON p.id = sl.product_id
      LEFT JOIN product_variants pv ON pv.id = sl.variant_id
      LEFT JOIN taxes t ON t.id = sl.tax_id
      WHERE sl.subscription_id = $1
      ORDER BY sl.id ASC
    `;
    const linesRes = await pool.query(linesQuery, [sub.id]);
    const lines = linesRes.rows.map((l) => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      variantId: l.variant_id,
      variantLabel: l.variant_value ? `${l.variant_attribute}: ${l.variant_value}` : null,
      qty: l.qty,
      unitPrice: parseFloat(l.unit_price),
      taxRate: parseFloat(l.tax_rate),
      amount: parseFloat(l.amount),
    }));

    // Invoices
    const invQuery = `
      SELECT id, number, period_start, period_end, total, status, due_date
      FROM invoices
      WHERE subscription_id = $1
      ORDER BY period_start DESC, id DESC
    `;
    const invRes = await pool.query(invQuery, [sub.id]);
    const invoices = invRes.rows.map((inv) => ({
      id: inv.id,
      number: inv.number,
      period: `${inv.period_start} to ${inv.period_end}`,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
      total: parseFloat(inv.total),
      status: inv.status,
      dueDate: inv.due_date,
      due_date: inv.due_date,
    }));

    const allowedActions = computeAllowedActions(sub.status, planObj);

    res.json({
      id: sub.id,
      number: sub.number,
      subscriptionNumber: sub.number,
      customer: {
        id: sub.customer_id,
        name: sub.customer_name,
        email: sub.customer_email,
      },
      plan: planObj,
      paymentTerms: sub.payment_terms,
      payment_terms: sub.payment_terms,
      status: sub.status,
      startDate: sub.start_date,
      start_date: sub.start_date,
      expiryDate: sub.expiry_date,
      expiry_date: sub.expiry_date,
      nextBillingDate: sub.next_billing_date,
      next_billing_date: sub.next_billing_date,
      createdAt: sub.created_at,
      lines,
      invoices,
      allowedActions,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/subscriptions/:id/status
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const action = req.body.action || req.body.status;

    if (!action) {
      return res.status(400).json({ error: 'Action is required in request body' });
    }

    const subQuery = `
      SELECT s.id, s.number, s.status, s.start_date, s.expiry_date, s.next_billing_date,
             p.pausable, p.closable, p.renewable, p.auto_close
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.id::text = $1 OR s.number = $1
    `;
    const subRes = await pool.query(subQuery, [id]);
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subRes.rows[0];

    let updateRes;
    switch (action.toLowerCase()) {
      case 'quote': {
        if (sub.status !== 'Draft') {
          return res.status(400).json({
            error: `Cannot quote subscription: current status is '${sub.status}', expected 'Draft'`,
          });
        }
        updateRes = await pool.query(
          "UPDATE subscriptions SET status = 'Quotation' WHERE id = $1 AND status = 'Draft' RETURNING *",
          [sub.id]
        );
        break;
      }
      case 'confirm': {
        if (sub.status !== 'Quotation') {
          return res.status(400).json({
            error: `Cannot confirm subscription: current status is '${sub.status}', expected 'Quotation'`,
          });
        }
        updateRes = await pool.query(
          "UPDATE subscriptions SET status = 'Confirmed' WHERE id = $1 AND status = 'Quotation' RETURNING *",
          [sub.id]
        );
        break;
      }
      case 'activate': {
        if (sub.status !== 'Confirmed') {
          return res.status(400).json({
            error: `Cannot activate subscription: current status is '${sub.status}', expected 'Confirmed'`,
          });
        }
        updateRes = await pool.query(
          `UPDATE subscriptions
           SET status = 'Active',
               next_billing_date = COALESCE(next_billing_date, start_date)
           WHERE id = $1 AND status = 'Confirmed'
           RETURNING *`,
          [sub.id]
        );
        break;
      }
      case 'pause': {
        if (sub.status !== 'Active') {
          return res.status(400).json({
            error: `Cannot pause subscription: current status is '${sub.status}', expected 'Active'`,
          });
        }
        if (!sub.pausable) {
          return res.status(400).json({
            error: "Cannot pause subscription: plan does not allow pausing",
          });
        }
        updateRes = await pool.query(
          "UPDATE subscriptions SET status = 'Paused' WHERE id = $1 AND status = 'Active' RETURNING *",
          [sub.id]
        );
        break;
      }
      case 'resume': {
        if (sub.status !== 'Paused') {
          return res.status(400).json({
            error: `Cannot resume subscription: current status is '${sub.status}', expected 'Paused'`,
          });
        }
        updateRes = await pool.query(
          "UPDATE subscriptions SET status = 'Active' WHERE id = $1 AND status = 'Paused' RETURNING *",
          [sub.id]
        );
        break;
      }
      case 'close': {
        if (!['Active', 'Paused'].includes(sub.status)) {
          return res.status(400).json({
            error: `Cannot close subscription: current status is '${sub.status}', expected 'Active' or 'Paused'`,
          });
        }
        if (!sub.closable) {
          return res.status(400).json({
            error: "Cannot close subscription: plan does not allow closing",
          });
        }
        updateRes = await pool.query(
          "UPDATE subscriptions SET status = 'Closed' WHERE id = $1 AND status IN ('Active', 'Paused') RETURNING *",
          [sub.id]
        );
        break;
      }
      case 'renew': {
        if (sub.status !== 'Closed') {
          return res.status(400).json({
            error: `Cannot renew subscription: current status is '${sub.status}', expected 'Closed'`,
          });
        }
        if (!sub.renewable) {
          return res.status(400).json({
            error: "Cannot renew subscription: plan is not renewable",
          });
        }
        updateRes = await pool.query(
          `UPDATE subscriptions
           SET status = 'Active',
               expiry_date = COALESCE(expiry_date, current_date) + interval '1 year',
               next_billing_date = current_date
           WHERE id = $1 AND status = 'Closed'
           RETURNING *`,
          [sub.id]
        );
        break;
      }
      default:
        return res.status(400).json({
          error: `Invalid transition action '${action}'. Allowed: quote, confirm, activate, pause, resume, close, renew`,
        });
    }

    if (!updateRes || updateRes.rows.length === 0) {
      return res.status(400).json({
        error: `Action '${action}' could not be applied. Current status may have changed.`,
      });
    }

    const updated = updateRes.rows[0];
    res.json({
      ok: true,
      message: `Subscription status updated to '${updated.status}'`,
      subscription: updated,
    });
  } catch (err) {
    next(err);
  }
}

// Helper to compute unit price from DB product and variant
async function computeLineUnitPrice(productId, variantId) {
  const query = `
    SELECT p.sales_price, COALESCE(pv.extra_price, 0) AS extra_price
    FROM products p
    LEFT JOIN product_variants pv ON pv.id = $2 AND pv.product_id = p.id
    WHERE p.id = $1
  `;
  const res = await pool.query(query, [productId, variantId || null]);
  if (res.rows.length === 0) {
    throw new Error(`Product id ${productId} not found`);
  }
  return parseFloat(res.rows[0].sales_price) + parseFloat(res.rows[0].extra_price);
}

// POST /api/subscriptions
async function createSubscription(req, res, next) {
  const client = await pool.connect();
  try {
    const { templateId, customerId, planId, startDate, expiryDate, paymentTerms, lines, qty } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    let finalPlanId = planId;
    let finalStartDate = startDate || new Date().toISOString().split('T')[0];
    let finalExpiryDate = expiryDate;
    let finalPaymentTerms = paymentTerms || 'Net 15';
    let rawLines = lines || [];

    // If templateId provided, load structure from template
    if (templateId) {
      const tmplRes = await client.query(
        'SELECT plan_id, validity_days FROM quotation_templates WHERE id = $1',
        [templateId]
      );
      if (tmplRes.rows.length === 0) {
        return res.status(404).json({ error: 'Quotation template not found' });
      }
      const tmpl = tmplRes.rows[0];
      finalPlanId = tmpl.plan_id;

      if (!finalExpiryDate) {
        const d = new Date(finalStartDate);
        d.setDate(d.getDate() + (tmpl.validity_days || 30));
        finalExpiryDate = d.toISOString().split('T')[0];
      }

      const tmplLinesRes = await client.query(
        'SELECT product_id, variant_id, qty FROM quotation_template_lines WHERE template_id = $1',
        [templateId]
      );
      const mult = parseInt(qty || 1, 10);
      rawLines = tmplLinesRes.rows.map((tl) => ({
        productId: tl.product_id,
        variantId: tl.variant_id,
        qty: tl.qty * mult,
      }));
    }

    if (!finalPlanId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    if (!rawLines || rawLines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Default GST 18% tax
    const taxRes = await client.query(
      "SELECT id FROM taxes WHERE name ILIKE '%18%' LIMIT 1"
    );
    const defaultTaxId = taxRes.rows.length > 0 ? taxRes.rows[0].id : 1;

    await client.query('BEGIN');

    // Generate sequence SUB-XXXX
    const numRes = await client.query(
      "SELECT COALESCE(MAX(SUBSTRING(number FROM 'SUB-([0-9]+)')::int), 0) + 1 AS next_num FROM subscriptions"
    );
    const nextNum = numRes.rows[0].next_num;
    const subNumber = 'SUB-' + String(nextNum).padStart(4, '0');

    // Insert subscription with status 'Draft'
    const subInsertRes = await client.query(
      `INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status, next_billing_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'Draft', NULL)
       RETURNING *`,
      [subNumber, customerId, finalPlanId, finalStartDate, finalExpiryDate, finalPaymentTerms]
    );
    const newSub = subInsertRes.rows[0];

    // Compute unit price and insert lines
    for (const l of rawLines) {
      const unitPrice = await computeLineUnitPrice(l.productId, l.variantId);
      const lineQty = Math.max(1, parseInt(l.qty || 1, 10));

      await client.query(
        `INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newSub.id, l.productId, l.variantId || null, lineQty, unitPrice, defaultTaxId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      ok: true,
      subscription: newSub,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// POST /api/subscriptions/price-preview
async function pricePreview(req, res, next) {
  try {
    const { lines } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines array is required' });
    }

    // Default tax rate 18%
    const taxRes = await pool.query(
      "SELECT id, COALESCE(rate, 18) AS rate FROM taxes WHERE name ILIKE '%18%' LIMIT 1"
    );
    const defaultTaxRate = taxRes.rows.length > 0 ? parseFloat(taxRes.rows[0].rate) : 18;

    // Build line rows with backend computed unit prices
    const fullLines = [];
    for (const l of lines) {
      const unitPrice = await computeLineUnitPrice(l.productId, l.variantId);
      fullLines.push({
        product_id: l.productId,
        variant_id: l.variantId || null,
        qty: parseInt(l.qty || 1, 10),
        unit_price: unitPrice,
        tax_rate: defaultTaxRate,
      });
    }

    // Eligible discounts
    const discRes = await pool.query(
      `SELECT id, code, type, value, min_purchase, min_qty, start_date, end_date,
              usage_limit, used_count, applies_to, target_product_id
       FROM discounts
       WHERE (start_date IS NULL OR start_date <= current_date)
         AND (end_date IS NULL OR end_date >= current_date)
         AND (usage_limit IS NULL OR used_count < usage_limit)`
    );

    const math = calculateInvoiceMath(fullLines, discRes.rows);

    res.json({
      subtotal: math.subtotal,
      discount: math.discountTotal,
      discountTotal: math.discountTotal,
      tax: math.taxTotal,
      taxTotal: math.taxTotal,
      total: math.total,
      discountCode: math.bestDiscount ? math.bestDiscount.code : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSubscriptions,
  getSubscriptionById,
  updateStatus,
  createSubscription,
  pricePreview,
};

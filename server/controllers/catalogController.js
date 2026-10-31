const pool = require('../db');

// GET /api/customers
async function listCustomers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 10, 10)));
    const offset = (page - 1) * pageSize;
    const { search } = req.query;

    const conditions = ["u.role = 'customer'"];
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(u.id)::int AS total FROM users u ${whereClause}`;
    const countRes = await pool.query(countQuery, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(pageSize, offset);
    const dataQuery = `
      SELECT u.id, u.name, u.email, u.created_at AS "createdAt",
             COUNT(DISTINCT s.id)::int AS "subscriptionCount",
             COALESCE(SUM(GREATEST(0, i.total - COALESCE(p.paid, 0))), 0)::numeric(12,2) AS "outstandingAmount"
      FROM users u
      LEFT JOIN subscriptions s ON s.customer_id = u.id
      LEFT JOIN invoices i ON i.subscription_id = s.id AND i.status NOT IN ('Cancelled')
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.id ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataRes = await pool.query(dataQuery, params);
    const data = dataRes.rows.map((r) => ({
      ...r,
      outstandingAmount: parseFloat(r.outstandingAmount),
    }));

    res.json({
      data,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/:id
async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND role = 'customer'",
      [id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = userRes.rows[0];

    // Subscriptions
    const subRes = await pool.query(
      `SELECT s.id, s.number, s.status, s.start_date, s.expiry_date, s.next_billing_date,
              p.name AS plan_name,
              COALESCE(SUM(sl.qty * sl.unit_price), 0)::numeric(12,2) AS amount
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       LEFT JOIN subscription_lines sl ON sl.subscription_id = s.id
       WHERE s.customer_id = $1
       GROUP BY s.id, p.name
       ORDER BY s.id DESC`,
      [customer.id]
    );

    // Invoices
    const invRes = await pool.query(
      `SELECT i.id, i.number, i.period_start, i.period_end, i.total, i.status, i.due_date,
              COALESCE(p.paid, 0)::numeric(12,2) AS paid_amount,
              GREATEST(0, i.total - COALESCE(p.paid, 0))::numeric(12,2) AS outstanding
       FROM invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id
       WHERE s.customer_id = $1
       ORDER BY i.id DESC`,
      [customer.id]
    );

    // Payments
    const payRes = await pool.query(
      `SELECT p.id, p.invoice_id, p.method, p.amount, p.date, p.note, i.number AS invoice_number
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       JOIN subscriptions s ON s.id = i.subscription_id
       WHERE s.customer_id = $1
       ORDER BY p.date DESC, p.id DESC`,
      [customer.id]
    );

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      createdAt: customer.created_at,
      subscriptions: subRes.rows.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      invoices: invRes.rows.map((i) => ({
        ...i,
        total: parseFloat(i.total),
        paidAmount: parseFloat(i.paid_amount),
        outstanding: parseFloat(i.outstanding),
      })),
      payments: payRes.rows.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/products
async function listProducts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 50, 10)));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM products');
    const total = countRes.rows[0]?.total || 0;

    const query = `
      SELECT p.id, p.name, p.type, p.sales_price::numeric(12,2) AS "salesPrice",
             p.cost_price::numeric(12,2) AS "costPrice", p.notes,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pv.id,
                   'attribute', pv.attribute,
                   'value', pv.value,
                   'extraPrice', pv.extra_price::numeric(12,2),
                   'unitPrice', (p.sales_price + pv.extra_price)::numeric(12,2)
                 ) ORDER BY pv.id
               ) FILTER (WHERE pv.id IS NOT NULL),
               '[]'::json
             ) AS variants
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      GROUP BY p.id
      ORDER BY p.id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    res.json({
      data: result.rows.map((r) => ({
        ...r,
        salesPrice: parseFloat(r.salesPrice),
        costPrice: parseFloat(r.costPrice),
      })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/plans
async function listPlans(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 50, 10)));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM plans');
    const total = countRes.rows[0]?.total || 0;

    const query = `
      SELECT id, name, price::numeric(12,2), period, min_qty AS "minQty",
             valid_from AS "validFrom", valid_to AS "validTo",
             auto_close AS "autoClose", closable, pausable, renewable,
             auto_close, closable, pausable, renewable
      FROM plans
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    res.json({
      data: result.rows.map((r) => ({ ...r, price: parseFloat(r.price) })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/taxes
async function listTaxes(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 50, 10)));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM taxes');
    const total = countRes.rows[0]?.total || 0;

    const query = `
      SELECT id, name, rate::numeric(5,2), applies_to AS "appliesTo", applies_to
      FROM taxes
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    res.json({
      data: result.rows.map((r) => ({ ...r, rate: parseFloat(r.rate) })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/discounts
async function listDiscounts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 50, 10)));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM discounts');
    const total = countRes.rows[0]?.total || 0;

    const query = `
      SELECT id, code, type, value::numeric(12,2), min_purchase::numeric(12,2) AS "minPurchase",
             min_qty AS "minQty", start_date AS "startDate", end_date AS "endDate",
             usage_limit AS "usageLimit", used_count AS "usedCount",
             applies_to AS "appliesTo", target_product_id AS "targetProductId",
             (
               (start_date IS NULL OR start_date <= current_date) AND
               (end_date IS NULL OR end_date >= current_date) AND
               (usage_limit IS NULL OR used_count < usage_limit)
             ) AS active
      FROM discounts
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    res.json({
      data: result.rows.map((r) => ({
        ...r,
        value: parseFloat(r.value),
        minPurchase: parseFloat(r.minPurchase),
      })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/quotation-templates
async function listQuotationTemplates(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 50, 10)));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM quotation_templates');
    const total = countRes.rows[0]?.total || 0;

    const query = `
      SELECT qt.id, qt.name, qt.plan_id AS "planId", qt.validity_days AS "validityDays",
             p.name AS "planName",
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', qtl.id,
                   'productId', qtl.product_id,
                   'variantId', qtl.variant_id,
                   'qty', qtl.qty,
                   'productName', pr.name,
                   'variantAttribute', pv.attribute,
                   'variantValue', pv.value,
                   'unitPrice', (pr.sales_price + COALESCE(pv.extra_price, 0))::numeric(12,2)
                 ) ORDER BY qtl.id
               ) FILTER (WHERE qtl.id IS NOT NULL),
               '[]'::json
             ) AS lines
      FROM quotation_templates qt
      LEFT JOIN plans p ON p.id = qt.plan_id
      LEFT JOIN quotation_template_lines qtl ON qtl.template_id = qt.id
      LEFT JOIN products pr ON pr.id = qtl.product_id
      LEFT JOIN product_variants pv ON pv.id = qtl.variant_id
      GROUP BY qt.id, p.name
      ORDER BY qt.id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    res.json({
      data: result.rows,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCustomers,
  getCustomerById,
  listProducts,
  listPlans,
  listTaxes,
  listDiscounts,
  listQuotationTemplates,
};

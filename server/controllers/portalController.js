const pool = require('../db');
const { formatInvoiceRow } = require('./invoiceController');

// GET /api/portal/summary
async function getSummary(req, res, next) {
  try {
    const customerId = req.user.id;

    const query = `
      WITH customer_invoices AS (
        SELECT i.id, i.total, i.status, i.due_date,
               COALESCE(SUM(p.amount), 0) AS paid_amount
        FROM invoices i
        JOIN subscriptions s ON s.id = i.subscription_id
        LEFT JOIN payments p ON p.invoice_id = i.id
        WHERE s.customer_id = $1
        GROUP BY i.id, i.total, i.status, i.due_date
      ),
      customer_subs AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'Active')::int AS active_subscriptions,
          MIN(next_billing_date) FILTER (WHERE status = 'Active') AS next_billing_date
        FROM subscriptions
        WHERE customer_id = $1
      )
      SELECT
        COALESCE(SUM(GREATEST(0, ci.total - ci.paid_amount)) FILTER (WHERE ci.status IN ('Draft', 'Confirmed')), 0)::numeric(12,2) AS amount_owed,
        COUNT(*) FILTER (WHERE ci.due_date < current_date AND ci.status NOT IN ('Paid', 'Cancelled'))::int AS overdue_count,
        cs.active_subscriptions,
        cs.next_billing_date
      FROM customer_subs cs
      LEFT JOIN customer_invoices ci ON true
      GROUP BY cs.active_subscriptions, cs.next_billing_date;
    `;

    const result = await pool.query(query, [customerId]);
    const row = result.rows[0] || {};

    res.json({
      amountOwed: parseFloat(row.amount_owed || 0),
      overdueCount: parseInt(row.overdue_count || 0, 10),
      activeSubscriptions: parseInt(row.active_subscriptions || 0, 10),
      nextBillingDate: row.next_billing_date || null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/portal/subscriptions
async function getSubscriptions(req, res, next) {
  try {
    const customerId = req.user.id;

    const query = `
      SELECT s.id,
             s.number,
             s.customer_id AS "customerId",
             s.plan_id AS "planId",
             p.name AS "planName",
             p.period AS "billingPeriod",
             s.start_date AS "startDate",
             s.expiry_date AS "expiryDate",
             s.payment_terms AS "paymentTerms",
             s.status,
             s.next_billing_date AS "nextBillingDate",
             s.created_at AS "createdAt",
             COALESCE(SUM(sl.qty * sl.unit_price), 0)::numeric(12,2) AS "totalAmount",
             COALESCE(SUM(sl.qty), 0)::int AS "seats"
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      LEFT JOIN subscription_lines sl ON sl.subscription_id = s.id
      WHERE s.customer_id = $1
      GROUP BY s.id, p.name, p.period
      ORDER BY s.id DESC
    `;

    const result = await pool.query(query, [customerId]);
    const data = result.rows.map((r) => ({
      ...r,
      subscriptionNumber: r.number,
      totalAmount: parseFloat(r.totalAmount),
    }));

    res.json({
      data,
      total: data.length,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/portal/subscriptions/:id
async function getSubscriptionById(req, res, next) {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const subQuery = `
      SELECT s.id,
             s.number,
             s.customer_id,
             s.plan_id,
             p.name AS plan_name,
             p.period AS plan_period,
             p.price AS plan_price,
             s.start_date,
             s.expiry_date,
             s.payment_terms,
             s.status,
             s.next_billing_date,
             s.created_at
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE (s.id::text = $1 OR s.number = $1)
        AND s.customer_id = $2
    `;

    const subResult = await pool.query(subQuery, [id, customerId]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subResult.rows[0];

    // Fetch lines
    const linesQuery = `
      SELECT sl.id, sl.product_id, sl.variant_id, sl.qty, sl.unit_price,
             p.name AS product_name, pv.attribute AS variant_attribute, pv.value AS variant_value,
             t.name AS tax_name, COALESCE(t.rate, 0) AS tax_rate,
             (sl.qty * sl.unit_price)::numeric(12,2) AS amount
      FROM subscription_lines sl
      JOIN products p ON p.id = sl.product_id
      LEFT JOIN product_variants pv ON pv.id = sl.variant_id
      LEFT JOIN taxes t ON t.id = sl.tax_id
      WHERE sl.subscription_id = $1
      ORDER BY sl.id ASC
    `;
    const linesResult = await pool.query(linesQuery, [sub.id]);

    const lines = linesResult.rows.map((l) => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      variant: l.variant_value ? `${l.variant_attribute}: ${l.variant_value}` : null,
      qty: l.qty,
      unitPrice: parseFloat(l.unit_price),
      taxLabel: l.tax_rate > 0 ? `GST ${parseFloat(l.tax_rate)}%` : null,
      amount: parseFloat(l.amount),
    }));

    // Fetch billing history (invoices)
    const invQuery = `
      SELECT i.id, i.number, i.period_start, i.period_end, i.subtotal, i.discount_total,
             i.tax_total, i.total, i.due_date, i.status, i.created_at,
             COALESCE(p.paid_amount, 0)::numeric(12,2) AS paid_amount
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE i.subscription_id = $1
      ORDER BY i.period_start DESC, i.id DESC
    `;
    const invResult = await pool.query(invQuery, [sub.id]);

    const invoices = invResult.rows.map((inv) => {
      const total = parseFloat(inv.total);
      const paidAmount = parseFloat(inv.paid_amount);
      const outstanding = inv.status === 'Cancelled' ? 0 : Math.max(0, Math.round((total - paidAmount) * 100) / 100);
      return {
        id: inv.id,
        number: inv.number,
        invoiceNumber: inv.number,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        subtotal: parseFloat(inv.subtotal),
        discountTotal: parseFloat(inv.discount_total),
        taxTotal: parseFloat(inv.tax_total),
        total,
        paidAmount,
        outstanding,
        dueDate: inv.due_date,
        status: inv.status,
        createdAt: inv.created_at,
      };
    });

    res.json({
      id: sub.id,
      subscriptionNumber: sub.number,
      planName: sub.plan_name,
      billingPeriod: sub.plan_period,
      planPrice: parseFloat(sub.plan_price),
      startDate: sub.start_date,
      expiryDate: sub.expiry_date,
      nextBillingDate: sub.next_billing_date,
      paymentTerms: sub.payment_terms,
      status: sub.status,
      createdAt: sub.created_at,
      lines,
      invoices,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/portal/invoices
async function getInvoices(req, res, next) {
  try {
    const customerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 10, 10)));
    const offset = (page - 1) * pageSize;
    const { status } = req.query;

    const conditions = ['s.customer_id = $1'];
    const params = [customerId];

    if (status) {
      if (status.toLowerCase() === 'overdue') {
        conditions.push(`i.due_date < current_date AND i.status NOT IN ('Paid', 'Cancelled')`);
      } else {
        params.push(status);
        conditions.push(`LOWER(i.status) = LOWER($${params.length})`);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(pageSize, offset);
    const dataQuery = `
      SELECT i.id, i.number, i.subscription_id, i.period_start, i.period_end,
             i.subtotal, i.discount_total, i.tax_total, i.total,
             i.due_date, i.status, i.created_at,
             s.number AS subscription_number,
             s.customer_id,
             u.name AS customer_name,
             COALESCE(p.paid_amount, 0) AS paid_amount
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      ${whereClause}
      ORDER BY i.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataResult = await pool.query(dataQuery, params);
    const formatted = dataResult.rows.map(formatInvoiceRow);

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

// GET /api/portal/invoices/:id
async function getInvoiceById(req, res, next) {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const invoiceQuery = `
      SELECT i.id, i.number, i.subscription_id, i.period_start, i.period_end,
             i.subtotal, i.discount_total, i.tax_total, i.total,
             i.due_date, i.status, i.created_at,
             s.number AS subscription_number,
             s.customer_id,
             u.name AS customer_name,
             u.email AS customer_email,
             COALESCE(p.paid_amount, 0) AS paid_amount
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE (i.id::text = $1 OR i.number = $1)
        AND s.customer_id = $2
    `;

    const invoiceResult = await pool.query(invoiceQuery, [id, customerId]);
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const row = invoiceResult.rows[0];

    // Fetch lines
    const linesResult = await pool.query(
      `SELECT id, invoice_id, description, qty, unit_price, tax, amount
       FROM invoice_lines
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [row.id]
    );

    const lines = linesResult.rows.map((l) => ({
      id: l.id,
      description: l.description,
      qty: l.qty,
      unitPrice: parseFloat(l.unit_price),
      tax: parseFloat(l.tax),
      taxLabel: parseFloat(l.tax) > 0 ? `GST ${parseFloat(l.tax)}%` : null,
      amount: parseFloat(l.amount),
    }));

    // Fetch payments
    const paymentsResult = await pool.query(
      `SELECT id, invoice_id, method, amount, date, note
       FROM payments
       WHERE invoice_id = $1
       ORDER BY date DESC, id DESC`,
      [row.id]
    );

    const payments = paymentsResult.rows.map((p) => ({
      id: p.id,
      invoiceId: row.id,
      invoiceNumber: row.number,
      customerName: row.customer_name,
      method: p.method,
      amount: parseFloat(p.amount),
      date: p.date,
      note: p.note,
    }));

    const base = formatInvoiceRow(row);

    res.json({
      ...base,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        address: '',
      },
      subscription: {
        id: row.subscription_id,
        number: row.subscription_number,
      },
      lines,
      payments,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getSubscriptions,
  getSubscriptionById,
  getInvoices,
  getInvoiceById,
};

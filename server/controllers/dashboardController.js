const pool = require('../db');

function getDateBounds(preset, from, to) {
  if (from && to) {
    return { from, to };
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'last_month') {
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    return { from: start, to: end };
  }

  if (preset === 'this_quarter') {
    const qStartMonth = Math.floor(month / 3) * 3;
    const start = new Date(year, qStartMonth, 1).toISOString().split('T')[0];
    const end = new Date(year, qStartMonth + 3, 0).toISOString().split('T')[0];
    return { from: start, to: end };
  }

  // default 'this_month'
  const start = new Date(year, month, 1).toISOString().split('T')[0];
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { from: start, to: end };
}

// In-memory set for sent reminders
const sentReminders = new Set();

async function getDashboardData(filters = {}) {
  const customerId = filters.customerId ? parseInt(filters.customerId, 10) : null;
  const { from, to } = getDateBounds(filters.preset, filters.from, filters.to);

  // Run the 4 SQL aggregation queries in parallel
  const [statsRes, revenueRes, statusRes, overdueRes] = await Promise.all([
    // 1. Stats aggregation
    pool.query(
      `WITH cust_invoices AS (
         SELECT i.id, i.total, i.status, i.due_date,
                COALESCE(SUM(p.amount), 0) AS paid_amount
         FROM invoices i
         JOIN subscriptions s ON s.id = i.subscription_id
         LEFT JOIN payments p ON p.invoice_id = i.id
         WHERE ($1::int IS NULL OR s.customer_id = $1)
         GROUP BY i.id, i.total, i.status, i.due_date
       ),
       sub_stats AS (
         SELECT COUNT(*) FILTER (WHERE status = 'Active')::int AS active_subscriptions
         FROM subscriptions
         WHERE ($1::int IS NULL OR customer_id = $1)
       ),
       rev_stats AS (
         SELECT COALESCE(SUM(p.amount), 0)::numeric(12,2) AS revenue
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         JOIN subscriptions s ON s.id = i.subscription_id
         WHERE ($1::int IS NULL OR s.customer_id = $1)
           AND ($2::date IS NULL OR p.date >= $2::date)
           AND ($3::date IS NULL OR p.date <= $3::date)
       )
       SELECT
         ss.active_subscriptions,
         rs.revenue,
         COALESCE(SUM(GREATEST(0, ci.total - ci.paid_amount)) FILTER (WHERE ci.status IN ('Draft', 'Confirmed')), 0)::numeric(12,2) AS outstanding,
         COUNT(*) FILTER (WHERE ci.due_date < current_date AND ci.status NOT IN ('Paid', 'Cancelled'))::int AS overdue_count,
         COALESCE(SUM(GREATEST(0, ci.total - ci.paid_amount)) FILTER (WHERE ci.due_date < current_date AND ci.status NOT IN ('Paid', 'Cancelled')), 0)::numeric(12,2) AS overdue_amount
       FROM sub_stats ss
       CROSS JOIN rev_stats rs
       LEFT JOIN cust_invoices ci ON true
       GROUP BY ss.active_subscriptions, rs.revenue`,
      [customerId, from, to]
    ),

    // 2. 12 Months revenue via generate_series
    pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', current_date) - interval '11 months',
           date_trunc('month', current_date),
           interval '1 month'
         )::date AS m_start
       ),
       m_bounds AS (
         SELECT m_start,
                (m_start + interval '1 month')::date AS m_end,
                to_char(m_start, 'YYYY-MM') AS month_str,
                to_char(m_start, 'Mon') AS label_str
         FROM months
       )
       SELECT b.month_str AS month,
              b.label_str AS label,
              COALESCE(SUM(p.amount), 0)::numeric(12,2) AS revenue
       FROM m_bounds b
       LEFT JOIN payments p ON p.date >= b.m_start AND p.date < b.m_end
         AND ($1::int IS NULL OR p.invoice_id IN (
           SELECT i.id FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id WHERE s.customer_id = $1
         ))
       GROUP BY b.m_start, b.month_str, b.label_str
       ORDER BY b.m_start ASC`,
      [customerId]
    ),

    // 3. Status breakdown
    pool.query(
      `WITH inv_statuses AS (
         SELECT
           CASE
             WHEN i.status = 'Paid' THEN 'Paid'
             WHEN i.status = 'Cancelled' THEN 'Cancelled'
             WHEN i.status = 'Draft' THEN 'Draft'
             WHEN i.due_date < current_date THEN 'Overdue'
             ELSE 'Confirmed'
           END AS status,
           i.total
         FROM invoices i
         JOIN subscriptions s ON s.id = i.subscription_id
         WHERE ($1::int IS NULL OR s.customer_id = $1)
       ),
       all_statuses AS (
         SELECT unnest(ARRAY['Paid', 'Confirmed', 'Draft', 'Overdue', 'Cancelled']) AS status
       )
       SELECT a.status,
              COUNT(s.status)::int AS count,
              COALESCE(SUM(s.total), 0)::numeric(12,2) AS amount
       FROM all_statuses a
       LEFT JOIN inv_statuses s ON s.status = a.status
       GROUP BY a.status`,
      [customerId]
    ),

    // 4. Overdue invoices (top 20 oldest overdue)
    pool.query(
      `SELECT i.id,
              i.number,
              u.name AS customer_name,
              i.total::numeric(12,2),
              GREATEST(0, i.total - COALESCE(p.paid_amount, 0))::numeric(12,2) AS outstanding,
              i.due_date,
              (current_date - i.due_date)::int AS days_overdue
       FROM invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       JOIN users u ON u.id = s.customer_id
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS paid_amount
         FROM payments
         GROUP BY invoice_id
       ) p ON p.invoice_id = i.id
       WHERE i.due_date < current_date
         AND i.status NOT IN ('Paid', 'Cancelled')
         AND ($1::int IS NULL OR s.customer_id = $1)
       ORDER BY days_overdue DESC, i.id ASC
       LIMIT 20`,
      [customerId]
    ),
  ]);

  const rawStats = statsRes.rows[0] || {};
  const activeSubs = parseInt(rawStats.active_subscriptions || 0, 10);
  const revenueVal = parseFloat(rawStats.revenue || 0);
  const outstandingVal = parseFloat(rawStats.outstanding || 0);
  const overdueCnt = parseInt(rawStats.overdue_count || 0, 10);
  const overdueAmt = parseFloat(rawStats.overdue_amount || 0);

  const stats = {
    activeSubscriptions: activeSubs,
    revenue: revenueVal,
    revenueCollected: revenueVal,
    outstanding: outstandingVal,
    overdueCount: overdueCnt,
    overdueAmount: overdueAmt,
  };

  const revenueByMonth = revenueRes.rows.map((r) => ({
    month: r.month,
    label: r.label,
    revenue: parseFloat(r.revenue),
  }));

  const statusBreakdown = statusRes.rows.map((r) => ({
    status: r.status,
    count: parseInt(r.count, 10),
    amount: parseFloat(r.amount),
  }));

  const overdueInvoices = overdueRes.rows.map((r) => ({
    id: r.id,
    number: r.number,
    customerName: r.customer_name,
    total: parseFloat(r.total),
    outstanding: parseFloat(r.outstanding),
    dueDate: r.due_date,
    daysOverdue: parseInt(r.days_overdue, 10),
    isReminderSent: sentReminders.has(r.id),
  }));

  return {
    stats,
    revenueByMonth,
    statusBreakdown,
    overdueInvoices,
  };
}

// GET /api/dashboard
async function getDashboard(req, res, next) {
  try {
    const data = await getDashboardData(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/overdue (paginated overdue endpoint)
async function getOverdueInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize || 5, 10)));
    const offset = (page - 1) * pageSize;
    const customerId = req.query.customerId ? parseInt(req.query.customerId, 10) : null;

    const [countRes, dataRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(i.id)::int AS total
         FROM invoices i
         JOIN subscriptions s ON s.id = i.subscription_id
         WHERE i.due_date < current_date
           AND i.status NOT IN ('Paid', 'Cancelled')
           AND ($1::int IS NULL OR s.customer_id = $1)`,
        [customerId]
      ),
      pool.query(
        `SELECT i.id,
                i.number,
                u.name AS customer_name,
                i.total::numeric(12,2),
                GREATEST(0, i.total - COALESCE(p.paid_amount, 0))::numeric(12,2) AS outstanding,
                i.due_date,
                (current_date - i.due_date)::int AS days_overdue
         FROM invoices i
         JOIN subscriptions s ON s.id = i.subscription_id
         JOIN users u ON u.id = s.customer_id
         LEFT JOIN (
           SELECT invoice_id, SUM(amount) AS paid_amount
           FROM payments
           GROUP BY invoice_id
         ) p ON p.invoice_id = i.id
         WHERE i.due_date < current_date
           AND i.status NOT IN ('Paid', 'Cancelled')
           AND ($1::int IS NULL OR s.customer_id = $1)
         ORDER BY days_overdue DESC, i.id ASC
         LIMIT $2 OFFSET $3`,
        [customerId, pageSize, offset]
      ),
    ]);

    const total = countRes.rows[0]?.total || 0;
    const data = dataRes.rows.map((r) => ({
      id: r.id,
      number: r.number,
      customerName: r.customer_name,
      total: parseFloat(r.total),
      outstanding: parseFloat(r.outstanding),
      dueDate: r.due_date,
      daysOverdue: parseInt(r.days_overdue, 10),
      isReminderSent: sentReminders.has(r.id),
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

// POST /api/invoices/:id/remind or POST /api/invoices/:id/reminder
async function remindInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const findQuery = `
      SELECT i.id, i.number, i.status, i.due_date, i.total,
             u.name AS customer_name, u.email AS customer_email,
             COALESCE(p.paid_amount, 0) AS paid_amount
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid_amount
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE i.id::text = $1 OR i.number = $1
    `;

    const result = await pool.query(findQuery, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = result.rows[0];
    const outstanding = parseFloat(inv.total) - parseFloat(inv.paid_amount);

    if (inv.status === 'Paid' || outstanding <= 0) {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    if (inv.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cannot send reminder for a cancelled invoice' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate >= today) {
      return res.status(400).json({ error: 'Invoice is not overdue yet' });
    }

    sentReminders.add(inv.id);
    console.log(
      `Payment reminder: Invoice ${inv.number} sent to ${inv.customer_name} <${inv.customer_email}>. Outstanding: ₹${outstanding.toFixed(2)} (Due: ${inv.due_date})`
    );

    res.json({
      success: true,
      ok: true,
      message: `Payment reminder sent to ${inv.customer_name}`,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/summary
async function getReportsSummary(req, res, next) {
  try {
    const data = await getDashboardData(req.query);
    res.json({
      ...data,
      filters: {
        preset: req.query.preset || 'this_month',
        from: req.query.from || null,
        to: req.query.to || null,
        customerId: req.query.customerId || null,
        status: req.query.status || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getOverdueInvoices,
  remindInvoice,
  getReportsSummary,
  getDashboardData,
};

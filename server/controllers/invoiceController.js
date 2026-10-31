const pool = require('../db');

function formatInvoiceRow(row) {
  const paidAmount = parseFloat(row.paid_amount || 0);
  const total = parseFloat(row.total || 0);
  const outstanding = row.status === 'Cancelled' ? 0 : Math.max(0, Math.round((total - paidAmount) * 100) / 100);

  let daysOverdue = 0;
  let displayStatus = row.status;

  if (row.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(row.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - dueDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && !['Paid', 'Cancelled'].includes(row.status)) {
      daysOverdue = diffDays;
      if (row.status === 'Confirmed') {
        displayStatus = 'Overdue';
      }
    }
  }

  return {
    id: row.id,
    number: row.number,
    invoiceNumber: row.number,
    subscriptionId: row.subscription_id,
    subscriptionNumber: row.subscription_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    subtotal: parseFloat(row.subtotal),
    discountTotal: parseFloat(row.discount_total || 0),
    taxTotal: parseFloat(row.tax_total || 0),
    total,
    paidAmount,
    outstanding,
    dueDate: row.due_date,
    status: displayStatus,
    rawStatus: row.status,
    daysOverdue,
    discountLabel: row.discount_total > 0 ? `Discount (₹${row.discount_total})` : null,
    taxLabel: 'GST 18%',
    createdAt: row.created_at,
  };
}

// GET /api/invoices
async function listInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 10, 10)));
    const offset = (page - 1) * pageSize;

    const { status, customerId, search, overdue, from, to, sortBy, sortDir } = req.query;

    const conditions = [];
    const params = [];

    // Role-based filtering: Customers get ONLY their own invoices
    if (req.user.role === 'customer') {
      params.push(req.user.id);
      conditions.push(`s.customer_id = $${params.length}`);
    } else if (customerId) {
      params.push(customerId);
      conditions.push(`s.customer_id = $${params.length}`);
    }

    // Status filter
    if (status && status.toLowerCase() === 'overdue' || overdue === 'true' || overdue === true) {
      conditions.push(`i.due_date < current_date AND i.status NOT IN ('Paid', 'Cancelled')`);
    } else if (status) {
      params.push(status);
      conditions.push(`LOWER(i.status) = LOWER($${params.length})`);
    }

    // Date range (based on due_date)
    if (from) {
      params.push(from);
      conditions.push(`i.due_date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`i.due_date <= $${params.length}::date`);
    }

    // Search on invoice number or customer name
    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(i.number ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM invoices i
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Sorting safe column mapping
    const sortColumns = {
      number: 'i.number',
      dueDate: 'i.due_date',
      total: 'i.total',
      periodStart: 'i.period_start',
      createdAt: 'i.created_at',
    };
    const orderCol = sortColumns[sortBy] || 'i.id';
    const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Fetch paginated data
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
      ORDER BY ${orderCol} ${orderDirection}
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

// GET /api/invoices/:id
async function getInvoiceById(req, res, next) {
  try {
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
      WHERE i.id::text = $1 OR i.number = $1
    `;

    const invoiceResult = await pool.query(invoiceQuery, [id]);
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const row = invoiceResult.rows[0];

    // Customers can only see their own invoice
    if (req.user.role === 'customer' && row.customer_id !== req.user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

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

// PATCH /api/invoices/:id/confirm
async function confirmInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const findResult = await pool.query(
      'SELECT id, status FROM invoices WHERE id::text = $1 OR number = $1',
      [id]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = findResult.rows[0];
    if (inv.status !== 'Draft') {
      return res.status(400).json({ error: 'Only Draft invoices can be confirmed' });
    }

    await pool.query('UPDATE invoices SET status = $1 WHERE id = $2', ['Confirmed', inv.id]);

    // Re-fetch formatted invoice
    req.params.id = String(inv.id);
    const invoiceQuery = `
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
      WHERE i.id = $1
    `;
    const updatedRes = await pool.query(invoiceQuery, [inv.id]);
    res.json({ ok: true, invoice: formatInvoiceRow(updatedRes.rows[0]) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/invoices/:id/cancel
async function cancelInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const findResult = await pool.query(
      'SELECT id, status FROM invoices WHERE id::text = $1 OR number = $1',
      [id]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = findResult.rows[0];
    if (inv.status === 'Paid') {
      return res.status(400).json({ error: 'A Paid invoice cannot be cancelled' });
    }
    if (inv.status === 'Cancelled') {
      return res.status(400).json({ error: 'Invoice is already cancelled' });
    }

    await pool.query('UPDATE invoices SET status = $1 WHERE id = $2', ['Cancelled', inv.id]);

    const invoiceQuery = `
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
      WHERE i.id = $1
    `;
    const updatedRes = await pool.query(invoiceQuery, [inv.id]);
    res.json({ ok: true, invoice: formatInvoiceRow(updatedRes.rows[0]) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoiceById,
  confirmInvoice,
  cancelInvoice,
  formatInvoiceRow,
};

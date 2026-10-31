const pool = require('../db');

// POST /api/payments
async function recordPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const { invoiceId, method, amount, date, note } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const validMethods = ['Cash', 'Card', 'UPI', 'Bank'];
    if (!method || !validMethods.includes(method)) {
      return res.status(400).json({
        error: `Invalid payment method. Allowed methods: ${validMethods.join(', ')}`,
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    await client.query('BEGIN');

    // Lock invoice row FOR UPDATE
    const invRes = await client.query(
      `SELECT i.id, i.number, i.total, i.status, s.customer_id
       FROM invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       WHERE i.id::text = $1 OR i.number = $1
       FOR UPDATE`,
      [invoiceId]
    );

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];

    // Customers can only pay their own invoices
    if (req.user.role === 'customer' && invoice.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'Paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot record payment on an already Paid invoice' });
    }

    if (invoice.status === 'Cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot record payment on a Cancelled invoice' });
    }

    if (!['Draft', 'Confirmed'].includes(invoice.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Payments not allowed for invoice with status ${invoice.status}`,
      });
    }

    // Query current payments sum
    const paidRes = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = $1',
      [invoice.id]
    );
    const currentPaid = parseFloat(paidRes.rows[0].total_paid || 0);
    const invoiceTotal = parseFloat(invoice.total);
    const outstanding = Math.round((invoiceTotal - currentPaid) * 100) / 100;

    if (numAmount > outstanding + 0.001) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Payment amount (${numAmount}) exceeds the outstanding balance (${outstanding})`,
      });
    }

    const paymentDate = date ? date : new Date().toISOString().split('T')[0];
    const insertRes = await client.query(
      `INSERT INTO payments (invoice_id, method, amount, date, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, invoice_id, method, amount, date, note`,
      [invoice.id, method, numAmount, paymentDate, note || '']
    );

    const insertedPayment = insertRes.rows[0];
    const newTotalPaid = Math.round((currentPaid + numAmount) * 100) / 100;
    let finalStatus = invoice.status;

    // If total payments >= invoice total set status 'Paid'
    if (newTotalPaid >= invoiceTotal - 0.001) {
      finalStatus = 'Paid';
      await client.query('UPDATE invoices SET status = $1 WHERE id = $2', ['Paid', invoice.id]);
    }

    await client.query('COMMIT');

    const custRes = await pool.query(
      `SELECT u.name
       FROM subscriptions s
       JOIN users u ON u.id = s.customer_id
       WHERE s.id = (SELECT subscription_id FROM invoices WHERE id = $1)`,
      [invoice.id]
    );
    const customerName = custRes.rows.length > 0 ? custRes.rows[0].name : '';

    res.status(201).json({
      ok: true,
      payment: {
        id: insertedPayment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        customerName,
        method: insertedPayment.method,
        amount: parseFloat(insertedPayment.amount),
        date: insertedPayment.date,
        note: insertedPayment.note,
      },
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: finalStatus,
        total: invoiceTotal,
        paidAmount: newTotalPaid,
        outstanding: Math.max(0, Math.round((invoiceTotal - newTotalPaid) * 100) / 100),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/payments
async function listPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || 10, 10)));
    const offset = (page - 1) * pageSize;

    const { method, from, to, search } = req.query;

    const conditions = [];
    const params = [];

    // Customers only see payments for their invoices
    if (req.user.role === 'customer') {
      params.push(req.user.id);
      conditions.push(`s.customer_id = $${params.length}`);
    }

    if (method) {
      params.push(method);
      conditions.push(`LOWER(p.method) = LOWER($${params.length})`);
    }

    if (from) {
      params.push(from);
      conditions.push(`p.date >= $${params.length}::date`);
    }

    if (to) {
      params.push(to);
      conditions.push(`p.date <= $${params.length}::date`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(
        `(i.number ILIKE $${params.length} OR u.name ILIKE $${params.length} OR p.note ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(p.id) AS total
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(pageSize, offset);
    const dataQuery = `
      SELECT p.id, p.invoice_id, p.method, p.amount, p.date, p.note,
             i.number AS invoice_number, u.name AS customer_name
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN subscriptions s ON s.id = i.subscription_id
      JOIN users u ON u.id = s.customer_id
      ${whereClause}
      ORDER BY p.date DESC, p.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataRes = await pool.query(dataQuery, params);

    res.json({
      data: dataRes.rows.map((r) => ({
        id: r.id,
        invoiceId: r.invoice_id,
        invoiceNumber: r.invoice_number,
        customerName: r.customer_name,
        method: r.method,
        amount: parseFloat(r.amount),
        date: r.date,
        note: r.note || '',
      })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordPayment,
  listPayments,
};

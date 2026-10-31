const pool = require('../db');

/**
 * Calculates line amounts, best discount, and proportional tax for subscription lines.
 */
function calculateInvoiceMath(lines, discountCandidates) {
  let subtotal = 0;
  let totalQty = 0;
  const productLineMap = {}; // product_id -> { qty, subtotal }

  for (const line of lines) {
    const qty = parseInt(line.qty, 10);
    const unitPrice = parseFloat(line.unit_price);
    const lineAmount = Math.round(qty * unitPrice * 100) / 100;
    subtotal += lineAmount;
    totalQty += qty;

    if (!productLineMap[line.product_id]) {
      productLineMap[line.product_id] = { qty: 0, subtotal: 0 };
    }
    productLineMap[line.product_id].qty += qty;
    productLineMap[line.product_id].subtotal += lineAmount;
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Pick the single best eligible discount (no stacking)
  let bestDiscount = null;
  let maxDiscountAmount = 0;

  for (const disc of discountCandidates) {
    const minPurchase = parseFloat(disc.min_purchase || 0);
    const minQty = parseInt(disc.min_qty || 0, 10);
    const discValue = parseFloat(disc.value);

    let applicableBase = 0;
    let applicableQty = 0;

    if (disc.applies_to === 'product' && disc.target_product_id) {
      const prodInfo = productLineMap[disc.target_product_id];
      if (prodInfo) {
        applicableBase = prodInfo.subtotal;
        applicableQty = prodInfo.qty;
      }
    } else {
      applicableBase = subtotal;
      applicableQty = totalQty;
    }

    if (applicableQty >= minQty && applicableBase >= minPurchase) {
      let calcAmount = 0;
      if (disc.type === 'percentage') {
        calcAmount = applicableBase * (discValue / 100);
      } else if (disc.type === 'fixed') {
        calcAmount = Math.min(discValue, applicableBase);
      }

      calcAmount = Math.round(calcAmount * 100) / 100;
      if (calcAmount > maxDiscountAmount) {
        maxDiscountAmount = calcAmount;
        bestDiscount = {
          id: disc.id,
          code: disc.code,
          type: disc.type,
          value: discValue,
          amount: calcAmount,
        };
      }
    }
  }

  return buildLineDetails(lines, subtotal, maxDiscountAmount, bestDiscount);
}

function buildLineDetails(lines, subtotal, discountTotal, bestDiscount) {
  let sumTax = 0;
  const calculatedLines = [];

  for (const line of lines) {
    const qty = parseInt(line.qty, 10);
    const unitPrice = parseFloat(line.unit_price);
    const lineAmount = Math.round(qty * unitPrice * 100) / 100;
    const taxRate = parseFloat(line.tax_rate || 0);

    const lineDiscountShare = subtotal > 0 ? (discountTotal * (lineAmount / subtotal)) : 0;
    const taxableAmount = Math.max(0, lineAmount - lineDiscountShare);
    const lineTax = taxableAmount * (taxRate / 100);
    sumTax += lineTax;

    const desc = line.variant_value
      ? `${line.product_name} (${line.variant_attribute}: ${line.variant_value})`
      : (line.product_name || 'Brightloop subscription charge');

    calculatedLines.push({
      productId: line.product_id,
      variantId: line.variant_id,
      description: desc,
      qty,
      unitPrice,
      taxRate,
      amount: lineAmount,
    });
  }

  const taxTotal = Math.round(sumTax * 100) / 100;
  const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

  return {
    subtotal,
    discountTotal,
    bestDiscount,
    taxTotal,
    total,
    lines: calculatedLines,
  };
}

/**
 * Preview billing without writing any data.
 */
async function previewBilling() {
  return runBilling({ dryRun: true });
}

/**
 * Executes a billing preview or live billing run.
 */
async function runBilling({ dryRun = false } = {}) {
  // Query all active due subscriptions
  const dueQuery = await pool.query(
    `SELECT s.id, s.number, s.customer_id, s.plan_id, s.start_date, s.expiry_date,
            s.payment_terms, s.status, s.next_billing_date,
            u.name as customer_name,
            p.period as plan_period
     FROM subscriptions s
     JOIN users u ON u.id = s.customer_id
     JOIN plans p ON p.id = s.plan_id
     WHERE s.status = 'Active' AND s.next_billing_date <= current_date
     ORDER BY s.id ASC`
  );

  const dueSubs = dueQuery.rows;

  // Active discounts
  const discQuery = await pool.query(
    `SELECT id, code, type, value, min_purchase, min_qty, start_date, end_date,
            usage_limit, used_count, applies_to, target_product_id
     FROM discounts
     WHERE (start_date IS NULL OR start_date <= current_date)
       AND (end_date IS NULL OR end_date >= current_date)
       AND (usage_limit IS NULL OR used_count < usage_limit)`
  );

  const discountCandidates = discQuery.rows;

  if (dryRun) {
    let alreadyBilledCount = 0;
    let estimatedTotal = 0;

    for (const sub of dueSubs) {
      // Check if invoice already exists for (subscription_id, period_start)
      const existing = await pool.query(
        'SELECT id FROM invoices WHERE subscription_id = $1 AND period_start = $2',
        [sub.id, sub.next_billing_date]
      );

      if (existing.rows.length > 0) {
        alreadyBilledCount++;
        continue;
      }

      // Fetch subscription lines
      const linesQuery = await pool.query(
        `SELECT l.id, l.product_id, l.variant_id, l.qty, l.unit_price, l.tax_id,
                t.name as tax_name, COALESCE(t.rate, 0) as tax_rate,
                p.name as product_name, pv.attribute as variant_attribute, pv.value as variant_value
         FROM subscription_lines l
         JOIN products p ON p.id = l.product_id
         LEFT JOIN product_variants pv ON pv.id = l.variant_id
         LEFT JOIN taxes t ON t.id = l.tax_id
         WHERE l.subscription_id = $1`,
        [sub.id]
      );

      const math = calculateInvoiceMath(linesQuery.rows, discountCandidates);
      estimatedTotal += math.total;
    }

    return {
      dryRun: true,
      dueCount: dueSubs.length,
      estimatedTotal: Math.round(estimatedTotal * 100) / 100,
      alreadyBilledCount,
      created: [],
      skipped: alreadyBilledCount,
      skippedDuplicates: alreadyBilledCount,
      failed: [],
    };
  }

  // Live Run: process each subscription in its OWN transaction
  const created = [];
  const failed = [];
  let skippedDuplicates = 0;
  let totalCreatedAmount = 0;

  for (const sub of dueSubs) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock subscription row
      const subRes = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE',
        [sub.id]
      );

      if (subRes.rows.length === 0) {
        await client.query('ROLLBACK');
        continue;
      }

      const currentSub = subRes.rows[0];
      if (currentSub.status !== 'Active') {
        await client.query('ROLLBACK');
        continue;
      }

      const periodStart = currentSub.next_billing_date;

      // Period end: period_start + one plan period - 1 day
      const periodEndRes = await client.query(
        `SELECT ($1::date + CASE $2::text
           WHEN 'daily' THEN interval '1 day'
           WHEN 'weekly' THEN interval '1 week'
           WHEN 'monthly' THEN interval '1 month'
           WHEN 'yearly' THEN interval '1 year'
         END - interval '1 day')::date AS period_end`,
        [periodStart, sub.plan_period]
      );
      const periodEnd = periodEndRes.rows[0].period_end;

      // Parse payment terms: e.g. "Net 15" -> 15
      const match = String(sub.payment_terms || '').match(/\d+/);
      const termsDays = match ? parseInt(match[0], 10) : 15;
      const dueDateRes = await client.query(
        `SELECT ($1::date + ($2 || ' days')::interval)::date AS due_date`,
        [periodStart, termsDays]
      );
      const dueDate = dueDateRes.rows[0].due_date;

      // Fetch subscription lines
      const linesRes = await client.query(
        `SELECT l.id, l.product_id, l.variant_id, l.qty, l.unit_price, l.tax_id,
                t.name as tax_name, COALESCE(t.rate, 0) as tax_rate,
                p.name as product_name, pv.attribute as variant_attribute, pv.value as variant_value
         FROM subscription_lines l
         JOIN products p ON p.id = l.product_id
         LEFT JOIN product_variants pv ON pv.id = l.variant_id
         LEFT JOIN taxes t ON t.id = l.tax_id
         WHERE l.subscription_id = $1`,
        [sub.id]
      );

      let math = calculateInvoiceMath(linesRes.rows, discountCandidates);
      let appliedDiscountTotal = 0;

      // Enforce usage limit atomically
      if (math.bestDiscount) {
        const discRes = await client.query(
          `UPDATE discounts
           SET used_count = used_count + 1
           WHERE id = $1 AND (usage_limit IS NULL OR used_count < usage_limit)
           RETURNING id`,
          [math.bestDiscount.id]
        );

        if (discRes.rows.length > 0) {
          appliedDiscountTotal = math.bestDiscount.amount;
        } else {
          // Discount limit reached concurrently; recompute math with no discount
          math = buildLineDetails(linesRes.rows, math.subtotal, 0, null);
        }
      }

      // Generate invoice number
      const seqRes = await client.query(
        "SELECT 'INV-' || lpad(nextval('invoice_seq')::text, 5, '0') AS num"
      );
      const invoiceNumber = seqRes.rows[0].num;

      // Insert invoice
      const invInsertRes = await client.query(
        `INSERT INTO invoices (
           number, subscription_id, period_start, period_end,
           subtotal, discount_total, tax_total, total, due_date, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Draft')
         ON CONFLICT (subscription_id, period_start) DO NOTHING
         RETURNING id`,
        [
          invoiceNumber,
          sub.id,
          periodStart,
          periodEnd,
          math.subtotal,
          appliedDiscountTotal,
          math.taxTotal,
          math.total,
          dueDate,
        ]
      );

      // If nothing was inserted, rollback so discount count is not consumed
      if (invInsertRes.rows.length === 0) {
        await client.query('ROLLBACK');
        skippedDuplicates++;
        continue;
      }

      const newInvoiceId = invInsertRes.rows[0].id;

      // Insert invoice_lines
      for (const line of math.lines) {
        await client.query(
          `INSERT INTO invoice_lines (invoice_id, description, qty, unit_price, tax, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newInvoiceId, line.description, line.qty, line.unitPrice, line.taxRate, line.amount]
        );
      }

      // Advance subscriptions.next_billing_date by one plan period
      await client.query(
        `UPDATE subscriptions
         SET next_billing_date = CASE $2::text
           WHEN 'daily' THEN next_billing_date + interval '1 day'
           WHEN 'weekly' THEN next_billing_date + interval '1 week'
           WHEN 'monthly' THEN next_billing_date + interval '1 month'
           WHEN 'yearly' THEN next_billing_date + interval '1 year'
         END
         WHERE id = $1`,
        [sub.id, sub.plan_period]
      );

      await client.query('COMMIT');

      created.push({
        invoiceId: newInvoiceId,
        number: invoiceNumber,
        customerName: sub.customer_name,
        total: math.total,
      });
      totalCreatedAmount += math.total;
    } catch (err) {
      await client.query('ROLLBACK');
      failed.push({
        subscriptionNumber: sub.number,
        reason: err.message,
      });
    } finally {
      client.release();
    }
  }

  return {
    dryRun: false,
    dueCount: dueSubs.length,
    estimatedTotal: Math.round(totalCreatedAmount * 100) / 100,
    alreadyBilledCount: skippedDuplicates,
    created,
    skipped: skippedDuplicates,
    skippedDuplicates,
    failed,
  };
}

module.exports = {
  previewBilling,
  runBilling,
  calculateInvoiceMath,
};

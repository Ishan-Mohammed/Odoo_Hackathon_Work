require('dotenv').config();
const pool = require('../db');
const { runBilling } = require('../services/billingService');
const { recordPayment } = require('../controllers/paymentController');

// Helper to simulate express req/res for controller testing
function mockReqRes(body, user = { id: 1, role: 'admin' }) {
  let statusCode = 200;
  let responseBody = null;
  const req = { body, user };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };
  const next = (err) => {
    statusCode = 500;
    responseBody = { error: err.message };
  };
  return { req, res, getStatus: () => statusCode, getBody: () => responseBody, next };
}

async function runTests() {
  console.log('=====================================================');
  console.log('Brightloop Billing, Invoices & Payments Test Suite');
  console.log('=====================================================\n');

  let passedAll = true;

  try {
    // ------------------------------------------------------------------
    // Pre-check BULK10 initial used_count
    // ------------------------------------------------------------------
    const bulkPre = await pool.query(
      "SELECT used_count FROM discounts WHERE code = 'BULK10'"
    );
    const initialBulkCount = bulkPre.rows.length > 0 ? parseInt(bulkPre.rows[0].used_count, 10) : 0;

    // ------------------------------------------------------------------
    // (a) Running billing creates Acme invoice (subscription 1)
    // ------------------------------------------------------------------
    const run1 = await runBilling({ dryRun: false });
    const acmeInvRes = await pool.query(
      `SELECT id, number, subtotal, discount_total, tax_total, total, status
       FROM invoices
       WHERE subscription_id = 1
       ORDER BY id DESC LIMIT 1`
    );

    if (acmeInvRes.rows.length === 0) {
      console.log('FAIL (a): Acme invoice was not created');
      passedAll = false;
    } else {
      const inv = acmeInvRes.rows[0];
      const subtotal = parseFloat(inv.subtotal);
      const discount = parseFloat(inv.discount_total);
      const tax = parseFloat(inv.tax_total);
      const total = parseFloat(inv.total);

      const isSubtotalOk = Math.abs(subtotal - 12800.00) < 0.01;
      const isDiscountOk = Math.abs(discount - 1280.00) < 0.01;
      const isTaxOk = Math.abs(tax - 2073.60) < 0.01;
      const isTotalOk = Math.abs(total - 13593.60) < 0.01;

      if (isSubtotalOk && isDiscountOk && isTaxOk && isTotalOk) {
        console.log(`PASS (a): Acme invoice (${inv.number}) created with subtotal ${subtotal.toFixed(2)}, discount ${discount.toFixed(2)}, tax ${tax.toFixed(2)}, total ${total.toFixed(2)}`);
      } else {
        console.log(`FAIL (a): Acme invoice math mismatch: subtotal=${subtotal}, discount=${discount}, tax=${tax}, total=${total}`);
        passedAll = false;
      }
    }

    // ------------------------------------------------------------------
    // (b) Running billing a second time creates 0 new invoices (all skipped)
    // ------------------------------------------------------------------
    const run2 = await runBilling({ dryRun: false });
    if (run2.created.length === 0) {
      console.log(`PASS (b): Running billing a second time created 0 new invoices (${run2.skipped} skipped)`);
    } else {
      console.log(`FAIL (b): Second billing run created ${run2.created.length} new invoices instead of 0`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (c) BULK10 discount used_count increased by invoices that received it
    // ------------------------------------------------------------------
    const bulkPost = await pool.query(
      "SELECT used_count FROM discounts WHERE code = 'BULK10'"
    );
    const postBulkCount = bulkPost.rows.length > 0 ? parseInt(bulkPost.rows[0].used_count, 10) : 0;
    const bulkIncrease = postBulkCount - initialBulkCount;

    // Check how many invoices created in run1 received a discount
    const createdIds = run1.created.map((c) => c.invoiceId);
    let invoicesWithDiscount = 0;
    if (createdIds.length > 0) {
      const discInvsRes = await pool.query(
        'SELECT COUNT(*) as cnt FROM invoices WHERE id = ANY($1) AND discount_total > 0',
        [createdIds]
      );
      invoicesWithDiscount = parseInt(discInvsRes.rows[0].cnt, 10);
    }

    if (bulkIncrease === invoicesWithDiscount && bulkIncrease >= 1) {
      console.log(`PASS (c): BULK10 discount used_count increased by ${bulkIncrease} (matching ${invoicesWithDiscount} invoices that received it)`);
    } else {
      console.log(`FAIL (c): BULK10 used_count increased by ${bulkIncrease}, expected ${invoicesWithDiscount}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (d) UPI payment of 13593.60 on the Acme invoice sets it to Paid
    // ------------------------------------------------------------------
    const acmeInvoiceId = acmeInvRes.rows[0]?.id;
    const { req: reqD, res: resD, getStatus: getStatusD, getBody: getBodyD, next: nextD } = mockReqRes({
      invoiceId: acmeInvoiceId,
      method: 'UPI',
      amount: 13593.60,
      note: 'Full settlement for Acme Traders',
    });

    await recordPayment(reqD, resD, nextD);

    const postPayRes = await pool.query(
      'SELECT status FROM invoices WHERE id = $1',
      [acmeInvoiceId]
    );

    if (getStatusD() === 201 && postPayRes.rows[0]?.status === 'Paid') {
      console.log(`PASS (d): UPI payment of 13593.60 on Acme invoice set status to 'Paid'`);
    } else {
      console.log(`FAIL (d): Payment failed or status not 'Paid'. Status code: ${getStatusD()}, Invoice status: ${postPayRes.rows[0]?.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (e) A payment larger than the outstanding amount is rejected
    // ------------------------------------------------------------------
    // Test 1: On already Paid Acme invoice
    const { req: reqE1, res: resE1, getStatus: getStatusE1, getBody: getBodyE1, next: nextE1 } = mockReqRes({
      invoiceId: acmeInvoiceId,
      method: 'Card',
      amount: 100.00,
    });
    await recordPayment(reqE1, resE1, nextE1);

    // Test 2: On an unpaid invoice with an excessive amount
    const unpaidInvRes = await pool.query(
      "SELECT id, total FROM invoices WHERE status = 'Confirmed' LIMIT 1"
    );
    let rejectedOverpayment = false;
    if (unpaidInvRes.rows.length > 0) {
      const unpaid = unpaidInvRes.rows[0];
      const excessiveAmount = parseFloat(unpaid.total) + 50000;
      const { req: reqE2, res: resE2, getStatus: getStatusE2, getBody: getBodyE2, next: nextE2 } = mockReqRes({
        invoiceId: unpaid.id,
        method: 'Bank',
        amount: excessiveAmount,
      });
      await recordPayment(reqE2, resE2, nextE2);
      if (getStatusE2() === 400 && getBodyE2()?.error?.includes('exceeds')) {
        rejectedOverpayment = true;
      }
    } else {
      rejectedOverpayment = true; // Fallback if no Confirmed invoices in DB
    }

    if (getStatusE1() === 400 && rejectedOverpayment) {
      console.log(`PASS (e): Payment larger than outstanding amount (and payment on Paid invoice) rejected with 400`);
    } else {
      console.log(`FAIL (e): Overpayment was not properly rejected. Status: E1=${getStatusE1()}`);
      passedAll = false;
    }

    console.log('\n-----------------------------------------------------');
    if (passedAll) {
      console.log('ALL TESTS PASSED! (5/5)');
    } else {
      console.log('SOME TESTS FAILED.');
    }
    console.log('NOTE: This test modifies database records (creates invoices/payments).');
    console.log('Please reset the test database with:');
    console.log('  npm run db:setup');
    console.log('  npm run db:seed');
    console.log('-----------------------------------------------------\n');
  } catch (err) {
    console.error('Test execution error:', err);
    passedAll = false;
  } finally {
    await pool.end();
  }

  process.exitCode = passedAll ? 0 : 1;
}

runTests();

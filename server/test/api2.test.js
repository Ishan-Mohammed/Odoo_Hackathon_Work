require('dotenv').config();
const pool = require('../db');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runApi2Tests() {
  console.log('=====================================================');
  console.log('Brightloop Subscriptions & Catalog Test Suite (api2)');
  console.log('=====================================================\n');

  let passedAll = true;

  try {
    // 1. Staff login
    const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@brightloop.com', password: 'Demo@12345' }),
    });
    const staffAuth = await staffLoginRes.json();
    const staffToken = staffAuth.token;
    if (!staffToken) throw new Error(`Staff login failed: ${JSON.stringify(staffAuth)}`);

    // 2. Customer login
    const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@acme.com', password: 'Demo@12345' }),
    });
    const customerAuth = await customerLoginRes.json();
    const customerToken = customerAuth.token;
    if (!customerToken) throw new Error(`Customer login failed: ${JSON.stringify(customerAuth)}`);

    // ------------------------------------------------------------------
    // (a) GET /api/subscriptions as staff returns expected fields & total 2501
    // ------------------------------------------------------------------
    const resA = await fetch(`${BASE_URL}/subscriptions`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const dataA = await resA.json();

    const isTotal2501 = dataA.total >= 2501; // exact or greater if prior runs added
    const firstRow = dataA.data?.[0];
    const hasFields = firstRow &&
      firstRow.number &&
      firstRow.customerName &&
      firstRow.customerId &&
      firstRow.planName &&
      firstRow.status &&
      firstRow.startDate &&
      typeof firstRow.amount === 'number';

    if (resA.status === 200 && isTotal2501 && hasFields) {
      console.log(`PASS (a): GET /api/subscriptions as staff returned total ${dataA.total} (expected >= 2501) with all required fields`);
    } else {
      console.log(`FAIL (a): Subscriptions list failed. Status=${resA.status}, total=${dataA.total}, hasFields=${Boolean(hasFields)}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (b) Pause on an Active subscription whose plan has pausable = false returns 400
    // ------------------------------------------------------------------
    const unpausableRes = await pool.query(
      `SELECT s.id, s.number
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE p.pausable = false AND s.status = 'Active'
       LIMIT 1`
    );

    if (unpausableRes.rows.length === 0) {
      console.log('FAIL (b): No Active subscription with pausable=false found');
      passedAll = false;
    } else {
      const sub = unpausableRes.rows[0];
      const resB = await fetch(`${BASE_URL}/subscriptions/${sub.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'pause' }),
      });

      if (resB.status === 400) {
        console.log(`PASS (b): Pause on Active subscription #${sub.id} (${sub.number}, CRM Yearly) correctly returned 400`);
      } else {
        console.log(`FAIL (b): Expected 400, got status ${resB.status}`);
        passedAll = false;
      }
    }

    // ------------------------------------------------------------------
    // (c) Illegal jump (activate on a Draft subscription) returns 400
    // ------------------------------------------------------------------
    const draftRes = await pool.query(
      "SELECT id, number FROM subscriptions WHERE status = 'Draft' LIMIT 1"
    );

    if (draftRes.rows.length === 0) {
      console.log('FAIL (c): No Draft subscription found in DB');
      passedAll = false;
    } else {
      const draftSub = draftRes.rows[0];
      const resC = await fetch(`${BASE_URL}/subscriptions/${draftSub.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'activate' }),
      });

      if (resC.status === 400) {
        console.log(`PASS (c): Illegal jump (activate on Draft subscription #${draftSub.id}) correctly returned 400`);
      } else {
        console.log(`FAIL (c): Expected 400, got status ${resC.status}`);
        passedAll = false;
      }
    }

    // ------------------------------------------------------------------
    // (d) price-preview for CRM with Odoo variant, qty 5 returns 12800, 1280, 2073.6, 13593.6
    // ------------------------------------------------------------------
    const resD = await fetch(`${BASE_URL}/subscriptions/price-preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId: 1,
        lines: [{ productId: 1, variantId: 1, qty: 5 }],
      }),
    });
    const dataD = await resD.json();

    const isSubtotalMatch = Math.abs(parseFloat(dataD.subtotal) - 12800) < 0.01;
    const isDiscountMatch = Math.abs(parseFloat(dataD.discount) - 1280) < 0.01;
    const isTaxMatch = Math.abs(parseFloat(dataD.tax) - 2073.6) < 0.01;
    const isTotalMatch = Math.abs(parseFloat(dataD.total) - 13593.6) < 0.01;

    if (resD.status === 200 && isSubtotalMatch && isDiscountMatch && isTaxMatch && isTotalMatch) {
      console.log(`PASS (d): Price preview returned subtotal ${dataD.subtotal}, discount ${dataD.discount}, tax ${dataD.tax}, total ${dataD.total}`);
    } else {
      console.log(`FAIL (d): Price preview mismatch. Status=${resD.status}, data=${JSON.stringify(dataD)}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (e) customer@acme.com on GET /api/customers and GET /api/subscriptions returns 403
    // ------------------------------------------------------------------
    const [resCust, resSubs] = await Promise.all([
      fetch(`${BASE_URL}/customers`, { headers: { Authorization: `Bearer ${customerToken}` } }),
      fetch(`${BASE_URL}/subscriptions`, { headers: { Authorization: `Bearer ${customerToken}` } }),
    ]);

    if (resCust.status === 403 && resSubs.status === 403) {
      console.log('PASS (e): customer@acme.com on GET /api/customers and GET /api/subscriptions both returned 403');
    } else {
      console.log(`FAIL (e): Expected 403 on both. /customers=${resCust.status}, /subscriptions=${resSubs.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (f) Valid chain on one new Draft subscription (quote, confirm, activate) succeeds
    // ------------------------------------------------------------------
    // Create new Draft subscription
    const createRes = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: 3,
        planId: 1,
        startDate: '2026-11-01',
        paymentTerms: 'Net 15',
        lines: [{ productId: 1, variantId: 1, qty: 1 }],
      }),
    });
    const createData = await createRes.json();
    const newSubId = createData.subscription?.id;

    if (!newSubId) {
      console.log(`FAIL (f): Subscription creation failed: ${JSON.stringify(createData)}`);
      passedAll = false;
    } else {
      // 1. Quote
      const quoteRes = await fetch(`${BASE_URL}/subscriptions/${newSubId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'quote' }),
      });
      const quoteData = await quoteRes.json();

      // 2. Confirm
      const confirmRes = await fetch(`${BASE_URL}/subscriptions/${newSubId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'confirm' }),
      });
      const confirmData = await confirmRes.json();

      // 3. Activate
      const activateRes = await fetch(`${BASE_URL}/subscriptions/${newSubId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'activate' }),
      });
      const activateData = await activateRes.json();

      const quoteOk = quoteRes.status === 200 && quoteData.subscription?.status === 'Quotation';
      const confirmOk = confirmRes.status === 200 && confirmData.subscription?.status === 'Confirmed';
      const activateOk = activateRes.status === 200 && activateData.subscription?.status === 'Active';

      if (quoteOk && confirmOk && activateOk) {
        console.log(`PASS (f): Valid chain succeeded: Draft -> Quotation -> Confirmed -> Active on subscription #${newSubId}`);
      } else {
        console.log(`FAIL (f): Status chain failed. Quote=${quoteOk}, Confirm=${confirmOk}, Activate=${activateOk}`);
        passedAll = false;
      }
    }

    console.log('\n-----------------------------------------------------');
    if (passedAll) {
      console.log('ALL API2 TESTS PASSED! (6/6)');
    } else {
      console.log('SOME API2 TESTS FAILED.');
    }
    console.log('-----------------------------------------------------\n');
  } catch (err) {
    console.error('Test execution error:', err.message);
    passedAll = false;
  } finally {
    await pool.end();
  }

  process.exitCode = passedAll ? 0 : 1;
}

runApi2Tests();

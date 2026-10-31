require('dotenv').config();
const pool = require('../db');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runApi1Tests() {
  console.log('=====================================================');
  console.log('Brightloop Dashboard & Customer Portal Test Suite (api1)');
  console.log('=====================================================\n');

  let passedAll = true;

  try {
    // 1. Authenticate as admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brightloop.com', password: 'Demo@12345' }),
    });
    const adminAuth = await adminLoginRes.json();
    const adminToken = adminAuth.token;
    if (!adminToken) {
      throw new Error(`Failed to login as admin: ${JSON.stringify(adminAuth)}`);
    }

    // 2. Authenticate as customer
    const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@acme.com', password: 'Demo@12345' }),
    });
    const customerAuth = await customerLoginRes.json();
    const customerToken = customerAuth.token;
    if (!customerToken) {
      throw new Error(`Failed to login as customer: ${JSON.stringify(customerAuth)}`);
    }

    // ------------------------------------------------------------------
    // (a) GET /api/dashboard as admin returns all 4 sections in < 2000 ms
    // ------------------------------------------------------------------
    const startA = Date.now();
    const resA = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const elapsedA = Date.now() - startA;
    const dataA = await resA.json();

    const hasStats = Boolean(dataA.stats && typeof dataA.stats.activeSubscriptions === 'number');
    const hasRevenueByMonth = Array.isArray(dataA.revenueByMonth) && dataA.revenueByMonth.length === 12;
    const hasStatusBreakdown = Array.isArray(dataA.statusBreakdown) && dataA.statusBreakdown.length > 0;
    const hasOverdueInvoices = Array.isArray(dataA.overdueInvoices);

    if (resA.status === 200 && elapsedA < 2000 && hasStats && hasRevenueByMonth && hasStatusBreakdown && hasOverdueInvoices) {
      console.log(`PASS (a): GET /api/dashboard returned all 4 sections in ${elapsedA} ms`);
    } else {
      console.log(`FAIL (a): Dashboard failed or exceeded 2000 ms. Status=${resA.status}, ms=${elapsedA}, sections: stats=${hasStats}, revMonth=${hasRevenueByMonth}, statusBreakdown=${hasStatusBreakdown}, overdue=${hasOverdueInvoices}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (b) Dashboard response time with customer filter is under 2000 ms
    // ------------------------------------------------------------------
    const startB = Date.now();
    const resB = await fetch(`${BASE_URL}/dashboard?customerId=3`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const elapsedB = Date.now() - startB;
    const dataB = await resB.json();

    if (resB.status === 200 && elapsedB < 2000 && dataB.stats) {
      console.log(`PASS (b): Dashboard with customer filter responded in ${elapsedB} ms`);
    } else {
      console.log(`FAIL (b): Filtered dashboard failed or exceeded 2000 ms. Status=${resB.status}, ms=${elapsedB}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (c) customer@acme.com token on GET /api/dashboard returns 403
    // ------------------------------------------------------------------
    const resC = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    if (resC.status === 403) {
      console.log('PASS (c): customer@acme.com on GET /api/dashboard returned 403');
    } else {
      console.log(`FAIL (c): Expected 403 Forbidden, got status ${resC.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (d) customer@acme.com on GET /api/portal/invoices returns ONLY rows belonging to customer id 3
    // ------------------------------------------------------------------
    const resD = await fetch(`${BASE_URL}/portal/invoices`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const dataD = await resD.json();

    if (resD.status === 200 && Array.isArray(dataD.data)) {
      const allBelongToCustomer3 = dataD.data.every((inv) => inv.customerId === 3);
      if (allBelongToCustomer3) {
        console.log(`PASS (d): GET /api/portal/invoices returned ${dataD.data.length} invoices, all belonging to customer id 3`);
      } else {
        console.log('FAIL (d): Found invoices belonging to another customer!');
        passedAll = false;
      }
    } else {
      console.log(`FAIL (d): Portal invoices request failed. Status: ${resD.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // (e) Customer asking for another customer's invoice id returns 404
    // ------------------------------------------------------------------
    // Find an invoice belonging to subscription 2 or later (not Acme's customer id 3)
    const foreignInvQuery = await pool.query(
      `SELECT i.id
       FROM invoices i
       JOIN subscriptions s ON s.id = i.subscription_id
       WHERE s.customer_id <> 3
       LIMIT 1`
    );

    if (foreignInvQuery.rows.length === 0) {
      console.log('FAIL (e): No foreign invoices found in database to test.');
      passedAll = false;
    } else {
      const foreignInvoiceId = foreignInvQuery.rows[0].id;
      const resE = await fetch(`${BASE_URL}/portal/invoices/${foreignInvoiceId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      if (resE.status === 404) {
        console.log(`PASS (e): Customer access to foreign invoice #${foreignInvoiceId} correctly returned 404`);
      } else {
        console.log(`FAIL (e): Expected 404, got status ${resE.status} for foreign invoice`);
        passedAll = false;
      }
    }

    console.log('\n-----------------------------------------------------');
    if (passedAll) {
      console.log('ALL API1 TESTS PASSED! (5/5)');
    } else {
      console.log('SOME API1 TESTS FAILED.');
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

runApi1Tests();

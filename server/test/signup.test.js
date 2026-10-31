require('dotenv').config();
const pool = require('../db');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runSignupTests() {
  console.log('=====================================================');
  console.log('Brightloop Signup & DB Verification Test Suite');
  console.log('=====================================================\n');

  let passedAll = true;
  const timestamp = Date.now();
  const testEmail = `signup-test-${timestamp}@example.com`;
  const adminAttemptEmail = `signup-admin-attempt-${timestamp}@example.com`;
  const strongPassword = 'Password@123';
  const weakPassword = 'weak';

  const createdEmails = [testEmail, adminAttemptEmail];

  try {
    // ------------------------------------------------------------------
    // Check 1: Health check
    // ------------------------------------------------------------------
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.ok) {
      console.log('PASS 1: GET /api/health returned { ok: true }');
    } else {
      console.log(`FAIL 1: Health check failed. Status=${healthRes.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 2: POST /api/auth/signup with unique email and strong password
    // Expects: 201 with token and user.role = 'customer'
    // ------------------------------------------------------------------
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: testEmail,
        password: strongPassword,
      }),
    });
    const signupData = await signupRes.json();

    if (
      signupRes.status === 201 &&
      signupData.token &&
      signupData.user &&
      signupData.user.role === 'customer' &&
      signupData.user.email === testEmail
    ) {
      console.log('PASS 2: POST /api/auth/signup returned 201 with token and role "customer"');
    } else {
      console.log(`FAIL 2: Signup failed. Status=${signupRes.status}, data=${JSON.stringify(signupData)}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 3: Query database directly for that email
    // Assert exactly 1 users row exists (role customer, password_hash starts with $2)
    // ------------------------------------------------------------------
    const dbUserRes = await pool.query(
      'SELECT id, name, email, role, SUBSTRING(password_hash FROM 1 FOR 4) AS hash_prefix FROM users WHERE email = $1',
      [testEmail]
    );

    if (
      dbUserRes.rows.length === 1 &&
      dbUserRes.rows[0].role === 'customer' &&
      dbUserRes.rows[0].hash_prefix &&
      dbUserRes.rows[0].hash_prefix.startsWith('$2')
    ) {
      console.log('PASS 3: Postgres DB has exactly 1 row with role="customer" and bcrypt password hash ($2)');
    } else {
      console.log(`FAIL 3: DB user check failed. rows=${dbUserRes.rows.length}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 4: Assert customer record / presence in customers list
    // Schema note: users with role='customer' represent customer entities
    // Verify it appears in customer list query
    // ------------------------------------------------------------------
    const dbCustRes = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1 AND role = 'customer'",
      [testEmail]
    );

    if (dbCustRes.rows.length === 1) {
      console.log('PASS 4: Linked customer record verified in database (role="customer")');
    } else {
      console.log('FAIL 4: Linked customer record missing');
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 5: POST duplicate email again -> expects 409
    // ------------------------------------------------------------------
    const dupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Duplicate',
        email: testEmail,
        password: strongPassword,
      }),
    });
    const dupData = await dupRes.json();

    if (dupRes.status === 409 && (dupData.error?.toLowerCase().includes('already') || dupData.message?.toLowerCase().includes('already'))) {
      console.log('PASS 5: POST duplicate email rejected with 409 "Email already registered"');
    } else {
      console.log(`FAIL 5: Duplicate email did not return 409. Status=${dupRes.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 6: POST weak password -> expects 400
    // ------------------------------------------------------------------
    const weakRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass',
        email: `weak-${timestamp}@example.com`,
        password: weakPassword,
      }),
    });
    const weakData = await weakRes.json();

    if (weakRes.status === 400) {
      console.log('PASS 6: POST weak password rejected with 400 validation error');
    } else {
      console.log(`FAIL 6: Weak password did not return 400. Status=${weakRes.status}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 7: POST with role="admin" in body -> asserts saved role is STILL "customer"
    // ------------------------------------------------------------------
    const adminAttemptRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Attempt',
        email: adminAttemptEmail,
        password: strongPassword,
        role: 'admin',
      }),
    });
    const adminAttemptData = await adminAttemptRes.json();

    const dbHackerRes = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [adminAttemptEmail]
    );

    if (
      adminAttemptRes.status === 201 &&
      adminAttemptData.user?.role === 'customer' &&
      dbHackerRes.rows.length === 1 &&
      dbHackerRes.rows[0].role === 'customer'
    ) {
      console.log('PASS 7: POST with role="admin" body safely ignored; stored role is "customer"');
    } else {
      console.log(`FAIL 7: Role injection check failed. Saved role=${dbHackerRes.rows[0]?.role}`);
      passedAll = false;
    }

    // ------------------------------------------------------------------
    // Check 8: Login with the new account -> expects token
    // ------------------------------------------------------------------
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: strongPassword,
      }),
    });
    const loginData = await loginRes.json();

    if (
      loginRes.status === 200 &&
      loginData.token &&
      loginData.user?.email === testEmail &&
      loginData.user?.role === 'customer'
    ) {
      console.log('PASS 8: POST /api/auth/login with newly created user succeeded and returned token');
    } else {
      console.log(`FAIL 8: Login with new account failed. Status=${loginRes.status}`);
      passedAll = false;
    }

  } catch (err) {
    console.error('Unexpected error running test suite:', err.message);
    passedAll = false;
  } finally {
    // ------------------------------------------------------------------
    // Cleanup: Delete test rows created during test
    // ------------------------------------------------------------------
    try {
      await pool.query('DELETE FROM users WHERE email = ANY($1)', [createdEmails]);
      console.log('\nCLEANUP: Test users deleted successfully from database.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    } finally {
      await pool.end();
    }
  }

  console.log('\n=====================================================');
  console.log(passedAll ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
  console.log('=====================================================');
  process.exit(passedAll ? 0 : 1);
}

runSignupTests();

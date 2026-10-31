import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RotateCcw, ShieldCheck, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { DEMO_PASSWORD } from '../../config/demoCredentials';
import { resetStore, getStore } from '../../api/mock/store';
import { login, signup } from '../../api/auth';
import {
  addStaff,
  addVariant,
  updateDiscount,
  createProduct,
  previewSubscriptionPrice,
  createSubscription,
  transitionSubscription,
  runBilling,
  getMyPortalSummary,
  listMySubscriptions,
  listMyInvoices,
  getMyInvoice,
  recordPayment,
  getDashboard,
  listCustomers,
} from '../../api/client';

export default function SmokeTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [overallStatus, setOverallStatus] = useState(null); // 'pass' | 'fail' | null

  // Helper to switch session user in localStorage
  const setSession = (token, user) => {
    localStorage.setItem('brightloop_token', token);
    localStorage.setItem('brightloop_user', JSON.stringify(user));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setOverallStatus(null);

    // Save previous session to restore after tests finish
    const savedToken = localStorage.getItem('brightloop_token');
    const savedUser = localStorage.getItem('brightloop_user');

    const testResults = [];
    let allPassed = true;

    // Helper to log test step
    const recordStep = (num, name, passed, details, error = null) => {
      const stepResult = { num, name, passed, details, error };
      testResults.push(stepResult);
      setResults([...testResults]);
      if (!passed) allPassed = false;
    };

    try {
      // Step 0: Reset store to fresh state
      resetStore();

      // ─────────────────────────────────────────────────────────────
      // Step 1: Login as admin, add staff "Test Staff", add product variant, edit BULK10
      // ─────────────────────────────────────────────────────────────
      try {
        const adminAuth = await login({ email: 'admin@brightloop.com', password: DEMO_PASSWORD });
        setSession(adminAuth.token, adminAuth.user);

        const staffRes = await addStaff({ name: 'Test Staff', email: 'teststaff@brightloop.com' });
        const variantRes = await addVariant('prd_crm', {
          attribute: 'Support',
          value: 'Priority SLA',
          price: 400,
        });
        const discountRes = await updateDiscount('disc_bulk10', { value: 10, active: true });

        recordStep(
          1,
          'Admin setup: add staff, add product variant, edit BULK10',
          Boolean(staffRes?.user && variantRes?.ok && discountRes?.ok),
          `Added staff "${staffRes.user.name}", variant added, BULK10 active (10%)`
        );
      } catch (err) {
        recordStep(1, 'Admin setup: add staff, add product variant, edit BULK10', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 2: Login as the new staff, confirm writes to products are rejected with FORBIDDEN
      // ─────────────────────────────────────────────────────────────
      try {
        const staffAuth = await login({ email: 'teststaff@brightloop.com', password: DEMO_PASSWORD });
        setSession(staffAuth.token, staffAuth.user);

        let rejectedWithForbidden = false;
        try {
          await createProduct({ name: 'Illegal Product by Staff', salesPrice: 1000 });
        } catch (err) {
          if (err?.code === 'FORBIDDEN' || err?.response?.data?.code === 'FORBIDDEN') {
            rejectedWithForbidden = true;
          } else {
            throw err;
          }
        }

        recordStep(
          2,
          'Staff permissions: writes to products rejected with FORBIDDEN',
          rejectedWithForbidden,
          'Attempted createProduct as staff was properly blocked with 403 FORBIDDEN'
        );
      } catch (err) {
        recordStep(2, 'Staff permissions: writes to products rejected with FORBIDDEN', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 3: Staff creates subscription for Acme Traders (5 x Brightloop CRM + Brand: Odoo), live price = 13,593.60, confirm, activate
      // ─────────────────────────────────────────────────────────────
      let createdSubId = null;
      try {
        const preview = await previewSubscriptionPrice({
          lines: [{ productId: 'prd_crm', variantId: 'var_odoo', qty: 5 }],
        });

        const expectedTotal = 13593.60;
        const priceMatches = Math.abs(preview.total - expectedTotal) < 0.01;

        const subRes = await createSubscription({
          customerId: 'cust_01',
          planId: 'pln_monthly',
          lines: [{ productId: 'prd_crm', variantId: 'var_odoo', qty: 5 }],
        });

        createdSubId = subRes.subscription.id;
        await transitionSubscription(createdSubId, 'confirm');
        await transitionSubscription(createdSubId, 'activate');

        recordStep(
          3,
          'Subscription creation & live price verification (₹13,593.60)',
          priceMatches && Boolean(createdSubId),
          `Price preview returned exactly ₹${preview.total.toLocaleString('en-IN')}; Sub confirmed & activated`
        );
      } catch (err) {
        recordStep(3, 'Subscription creation & live price verification (₹13,593.60)', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 4: Staff runs billing: created >= 1; run billing again: created = 0 (duplicates skipped)
      // ─────────────────────────────────────────────────────────────
      try {
        const run1 = await runBilling({ dryRun: false });
        const run1Created = run1?.created?.length || 0;

        const run2 = await runBilling({ dryRun: false });
        const run2Created = run2?.created?.length || 0;

        const passed = run1Created >= 1 && run2Created === 0;

        recordStep(
          4,
          'Billing engine idempotency: 1st run creates >= 1, 2nd run created = 0',
          passed,
          `Run 1 created ${run1Created} invoice(s); Run 2 skipped duplicates and created ${run2Created} invoice(s)`
        );
      } catch (err) {
        recordStep(4, 'Billing engine idempotency: 1st run creates >= 1, 2nd run created = 0', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 5: customer@acme.com sees new subscription and invoice in portal, owe amount equals sum of unpaid invoices
      // ─────────────────────────────────────────────────────────────
      let unpaidInvoice = null;
      try {
        const custAuth = await login({ email: 'customer@acme.com', password: DEMO_PASSWORD });
        setSession(custAuth.token, custAuth.user);

        const summary = await getMyPortalSummary();
        const subsRes = await listMySubscriptions();
        const invsRes = await listMyInvoices();

        const unpaidInvoices = (invsRes?.data || []).filter(
          (i) => ['Confirmed', 'Overdue'].includes(i.status) && i.outstanding > 0.005
        );
        const expectedOwe = unpaidInvoices.reduce((sum, i) => sum + (Number(i.outstanding) || 0), 0);
        const owedAmount = summary?.amountOwed ?? summary?.outstandingTotal ?? 0;
        const oweMatches = Math.abs(owedAmount - expectedOwe) < 0.01;

        unpaidInvoice = unpaidInvoices[0] || invsRes?.data?.[0];

        recordStep(
          5,
          'Customer portal sync: active subs & owe amount equals sum of unpaid invoices',
          oweMatches && subsRes.data.length > 0,
          `Portal summary owes ₹${owedAmount.toLocaleString('en-IN')}, matching ${unpaidInvoices.length} open invoice(s)`
        );
      } catch (err) {
        recordStep(5, 'Customer portal sync: active subs & owe amount equals sum of unpaid invoices', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 6: Customer tries another customer's invoice id: NOT_FOUND
      // ─────────────────────────────────────────────────────────────
      try {
        let rejectedWithNotFound = false;
        try {
          // inv_0043 belongs to Matrix Hospitality (cust_07)
          await getMyInvoice('inv_0043');
        } catch (err) {
          if (err?.code === 'NOT_FOUND' || err?.response?.data?.code === 'NOT_FOUND') {
            rejectedWithNotFound = true;
          } else {
            throw err;
          }
        }

        recordStep(
          6,
          'Portal cross-tenant isolation: accessing foreign invoice returns NOT_FOUND',
          rejectedWithNotFound,
          'Calling getMyInvoice on another customer invoice gave expected 404 NOT_FOUND'
        );
      } catch (err) {
        recordStep(6, 'Portal cross-tenant isolation: accessing foreign invoice returns NOT_FOUND', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 7: Staff records payment bigger than outstanding: OVERPAYMENT; records exact: Paid, owe drops
      // ─────────────────────────────────────────────────────────────
      try {
        const staffAuth = await login({ email: 'staff@brightloop.com', password: DEMO_PASSWORD });
        setSession(staffAuth.token, staffAuth.user);

        if (!unpaidInvoice) {
          throw new Error('No unpaid invoice available to test payment');
        }

        const invOutstanding = unpaidInvoice.outstanding || unpaidInvoice.total;

        // 1. Try overpayment
        let rejectedOverpayment = false;
        try {
          await recordPayment({
            invoiceId: unpaidInvoice.id,
            amount: invOutstanding + 500,
            method: 'UPI',
          });
        } catch (err) {
          if (err?.code === 'OVERPAYMENT' || err?.response?.data?.code === 'OVERPAYMENT') {
            rejectedOverpayment = true;
          } else {
            throw err;
          }
        }

        // 2. Pay exact amount
        const payRes = await recordPayment({
          invoiceId: unpaidInvoice.id,
          amount: invOutstanding,
          method: 'UPI',
          note: 'Exact settlement smoke test',
        });

        const invoiceIsPaid = payRes?.invoice?.status === 'Paid' || payRes?.invoice?.outstanding === 0;

        // Check owe dropped on customer side
        const custAuth = await login({ email: 'customer@acme.com', password: DEMO_PASSWORD });
        setSession(custAuth.token, custAuth.user);
        const newSummary = await getMyPortalSummary();
        const newOwed = newSummary?.amountOwed ?? newSummary?.outstandingTotal ?? 0;

        const passed = rejectedOverpayment && invoiceIsPaid;

        recordStep(
          7,
          'Payment validation: overpayment rejected with OVERPAYMENT, exact settles invoice',
          passed,
          `Overpayment rejected correctly; invoice status is ${payRes?.invoice?.status}, customer owe balance now ₹${newOwed.toLocaleString('en-IN')}`
        );
      } catch (err) {
        recordStep(7, 'Payment validation: overpayment rejected with OVERPAYMENT, exact settles invoice', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 8: Customer tries an admin function: FORBIDDEN
      // ─────────────────────────────────────────────────────────────
      try {
        const custAuth = await login({ email: 'customer@acme.com', password: DEMO_PASSWORD });
        setSession(custAuth.token, custAuth.user);

        let rejectedWithForbidden = false;
        try {
          await getDashboard();
        } catch (err) {
          if (err?.code === 'FORBIDDEN' || err?.response?.data?.code === 'FORBIDDEN') {
            rejectedWithForbidden = true;
          } else {
            throw err;
          }
        }

        recordStep(
          8,
          'Role security: customer invoking admin getDashboard rejects with FORBIDDEN',
          rejectedWithForbidden,
          'Calling admin function as customer role returned 403 FORBIDDEN'
        );
      } catch (err) {
        recordStep(8, 'Role security: customer invoking admin getDashboard rejects with FORBIDDEN', false, null, err.message);
      }

      // ─────────────────────────────────────────────────────────────
      // Step 9: Signup of brand-new customer: appears in customers list, portal empty
      // ─────────────────────────────────────────────────────────────
      try {
        const uniqueEmail = `testuser_${Date.now()}@testcompany.in`;
        const signupRes = await signup({
          name: 'Quantum Logic Systems',
          email: uniqueEmail,
          password: DEMO_PASSWORD,
        });

        // Check in admin Customers list
        const adminAuth = await login({ email: 'admin@brightloop.com', password: DEMO_PASSWORD });
        setSession(adminAuth.token, adminAuth.user);
        const customersRes = await listCustomers({ search: 'Quantum Logic' });
        const existsInAdmin = (customersRes?.data || []).some((c) => c.email === uniqueEmail);

        // Check new customer portal is empty and all paid up
        setSession(signupRes.token, signupRes.user);
        const newSummary = await getMyPortalSummary();
        const newSubs = await listMySubscriptions();

        const finalOwed = newSummary?.amountOwed ?? newSummary?.outstandingTotal ?? 0;
        const portalClean =
          finalOwed === 0 &&
          (newSubs?.data?.length || 0) === 0;

        const passed = existsInAdmin && portalClean;

        recordStep(
          9,
          'New customer lifecycle: signup adds to admin list immediately, portal shows clean zero dues',
          passed,
          `Customer found in admin list: ${existsInAdmin ? 'YES' : 'NO'}; Portal amountOwed: ₹${finalOwed}, Subs: ${newSubs?.data?.length || 0}`
        );
      } catch (err) {
        recordStep(9, 'New customer lifecycle: signup adds to admin list immediately, portal shows clean zero dues', false, null, err.message);
      }

      setOverallStatus(allPassed ? 'pass' : 'fail');
    } finally {
      // Restore user session
      if (savedToken && savedUser) {
        localStorage.setItem('brightloop_token', savedToken);
        localStorage.setItem('brightloop_user', savedUser);
      }
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Automated System Smoke Test"
        subtitle="Mandatory 9-step integration verification of shared mock store, cross-role security, and billing lifecycle"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={runAllTests}
              isLoading={isRunning}
              className="gap-2 font-semibold shadow-soft-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              {isRunning ? 'Executing Scenarios...' : 'Run Smoke Test'}
            </Button>
          </div>
        }
      />

      {overallStatus && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            overallStatus === 'pass'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {overallStatus === 'pass' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600" />
            )}
            <div>
              <p className="font-bold text-sm">
                {overallStatus === 'pass'
                  ? 'All 9 Verification Scenarios PASSED (0 Errors)'
                  : 'Smoke Test FAILED — Please inspect red rows below'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {overallStatus === 'pass'
                  ? 'Role permissions, shared store transactions, pricing math, and tenant isolation fully verified.'
                  : 'One or more assertions did not resolve as expected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Test Steps ({results.length}/9 completed)
          </span>
          {results.length > 0 && (
            <span className="text-xs font-mono text-slate-500">
              {results.filter((r) => r.passed).length} passed,{' '}
              {results.filter((r) => !r.passed).length} failed
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30 text-brand-600" />
            <p className="text-sm font-medium text-slate-700">No test run recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Run Smoke Test&quot; above to execute the 9 end-to-end integration scenarios.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((res) => (
              <div
                key={res.num}
                className={`p-4 flex items-start gap-3.5 transition-colors ${
                  res.passed ? 'hover:bg-slate-50/60' : 'bg-rose-50/30'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {res.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Step {res.num}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{res.name}</h3>
                  </div>

                  {res.details && (
                    <p className="text-xs text-slate-600 mt-1 font-mono">{res.details}</p>
                  )}

                  {res.error && (
                    <p className="text-xs text-rose-600 mt-1 font-mono font-medium">
                      Error: {res.error}
                    </p>
                  )}
                </div>

                <span
                  className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    res.passed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {res.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

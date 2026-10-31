import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Server, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import {
  getDashboard,
  listInvoices,
  listSubscriptions,
  listPayments,
  listCustomers,
  listProducts,
  listPlans,
  listTaxes,
  listDiscounts,
  previewSubscriptionPrice,
  runBilling,
  listStaff,
} from '../../api/client';
import { getMe } from '../../api/auth';
import { USE_MOCK } from '../../config/env';

export default function ApiCheckPage() {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const tests = [
    {
      name: 'Auth / Me',
      endpoint: 'GET /api/auth/me',
      fn: () => getMe(),
    },
    {
      name: 'Dashboard Analytics',
      endpoint: 'GET /api/dashboard',
      fn: () => getDashboard(),
    },
    {
      name: 'Invoices Listing',
      endpoint: 'GET /api/invoices',
      fn: () => listInvoices({ pageSize: 5 }),
    },
    {
      name: 'Subscriptions Listing',
      endpoint: 'GET /api/subscriptions',
      fn: () => listSubscriptions({ pageSize: 5 }),
    },
    {
      name: 'Payments Listing',
      endpoint: 'GET /api/payments',
      fn: () => listPayments({ pageSize: 5 }),
    },
    {
      name: 'Customers Listing',
      endpoint: 'GET /api/customers',
      fn: () => listCustomers({ pageSize: 5 }),
    },
    {
      name: 'Catalog Products',
      endpoint: 'GET /api/products',
      fn: () => listProducts({ pageSize: 5 }),
    },
    {
      name: 'Catalog Plans',
      endpoint: 'GET /api/plans',
      fn: () => listPlans({ pageSize: 5 }),
    },
    {
      name: 'Catalog Taxes',
      endpoint: 'GET /api/taxes',
      fn: () => listTaxes({ pageSize: 5 }),
    },
    {
      name: 'Catalog Discounts',
      endpoint: 'GET /api/discounts',
      fn: () => listDiscounts({ pageSize: 5 }),
    },
    {
      name: 'Price Preview (Math)',
      endpoint: 'POST /api/subscriptions/price-preview',
      fn: () =>
        previewSubscriptionPrice({
          lines: [{ productId: 'prd_crm', variantId: 'var_odoo', qty: 5 }],
        }),
    },
    {
      name: 'Billing Engine Preview (DryRun)',
      endpoint: 'POST /api/billing/preview',
      fn: () => runBilling({ dryRun: true }),
    },
    {
      name: 'Staff Listing (Admin)',
      endpoint: 'GET /api/staff',
      fn: () => listStaff(),
    },
  ];

  const runAllChecks = async () => {
    setIsRunning(true);
    const initial = tests.map((t) => ({
      name: t.name,
      endpoint: t.endpoint,
      status: 'pending',
      duration: 0,
      output: null,
      error: null,
    }));
    setResults(initial);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const start = performance.now();
      try {
        const res = await t.fn();
        const duration = Math.round(performance.now() - start);
        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'success',
            duration,
            output: typeof res === 'object' ? JSON.stringify(res).slice(0, 100) + '...' : String(res),
          };
          return next;
        });
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'error',
            duration,
            error: err.message || err.code || 'Check failed',
          };
          return next;
        });
      }
    }
    setIsRunning(false);
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const totalChecks = results.length;
  const passedChecks = results.filter((r) => r.status === 'success').length;
  const failedChecks = results.filter((r) => r.status === 'error').length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              Dev Diagnostics
            </span>
            <span className="text-xs text-slate-500 font-mono">
              VITE_USE_MOCK: {String(USE_MOCK)} | URL: {import.meta.env.VITE_API_URL || '/api'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-6 h-6 text-brand-600" />
            Backend API Wiring Diagnostics
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={runAllChecks}
            disabled={isRunning}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />}
          >
            {isRunning ? 'Running...' : 'Rerun Checks'}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-soft-xs">
          <div className="text-xs text-slate-500 font-medium">Total Endpoint Checks</div>
          <div className="text-2xl font-bold text-slate-900">{totalChecks}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-soft-xs">
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Passed
          </div>
          <div className="text-2xl font-bold text-emerald-600">{passedChecks}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-soft-xs">
          <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Failed / Needs Auth
          </div>
          <div className="text-2xl font-bold text-rose-600">{failedChecks}</div>
        </div>
      </div>

      {/* Diagnostics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
              <th className="py-3 px-4">Function / Scope</th>
              <th className="py-3 px-4">Endpoint</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Latency</th>
              <th className="py-3 px-4">Details / Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {results.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 font-sans">{r.name}</td>
                <td className="py-3 px-4 text-slate-600 text-[11px]">{r.endpoint}</td>
                <td className="py-3 px-4">
                  {r.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-slate-400 font-sans text-xs">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Testing...
                    </span>
                  )}
                  {r.status === 'success' && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> OK
                    </span>
                  )}
                  {r.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-sans font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> FAILED
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-slate-500 text-[11px]">{r.duration}ms</td>
                <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                  {r.error ? (
                    <span className="text-rose-600 font-sans font-medium">{r.error}</span>
                  ) : (
                    r.output || '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

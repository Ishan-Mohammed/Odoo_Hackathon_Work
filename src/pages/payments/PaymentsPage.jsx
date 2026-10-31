/**
 * PaymentsPage — /payments
 *
 * SQL the backend needs:
 *   SELECT p.*, i.number AS invoice_number, i.customer_name
 *   FROM payments p
 *   JOIN invoices i ON i.id = p.invoice_id
 *   WHERE (... method / date / search filters ...)
 *   ORDER BY p.date DESC
 *   LIMIT :pageSize OFFSET :offset;
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CreditCard, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader  from '../../components/ui/PageHeader';
import FiltersBar  from '../../components/ui/FiltersBar';
import DataTable   from '../../components/ui/DataTable';
import MoneyText   from '../../components/ui/MoneyText';
import Button      from '../../components/ui/Button';
import Skeleton    from '../../components/ui/Skeleton';
import RecordPaymentDrawer from '../invoices/RecordPaymentDrawer';
import { methodMeta } from '../invoices/PaymentMethodPicker';

import { listPayments, listOpenInvoices } from '../../api/client';
import { formatDate, formatMoney } from '../../utils/format';

const PAGE_SIZE = 10;
const DEBOUNCE  = 300;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filters ───────────────────────────────────────────────────────
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [method, setMethod] = useState(searchParams.get('method') || '');
  const [from,   setFrom]   = useState(searchParams.get('from')   || '');
  const [to,     setTo]     = useState(searchParams.get('to')     || '');
  const [page,   setPage]   = useState(Number(searchParams.get('page')) || 1);

  // ── Data ──────────────────────────────────────────────────────────
  const [payments,    setPayments]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalAmt,    setTotalAmt]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── Record payment from /payments (needs invoice picker) ──────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [openInvs,    setOpenInvs]    = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedInv,   setSelectedInv]   = useState(null);

  const debouncedSearch = useDebounce(search, DEBOUNCE);

  // ── Sync URL ──────────────────────────────────────────────────────
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (method)          params.method = method;
    if (from)            params.from   = from;
    if (to)              params.to     = to;
    if (page > 1)        params.page   = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, method, from, to, page, setSearchParams]);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPayments({
        page, pageSize: PAGE_SIZE,
        search: debouncedSearch, method, from, to,
      });
      setPayments(res.data || []);
      setTotal(res.total || 0);

      // Total amount: full unfiltered sum for display
      const all = await listPayments({
        page: 1, pageSize: 9999,
        search: debouncedSearch, method, from, to,
      });
      setTotalAmt((all.data || []).reduce((s, p) => s + p.amount, 0));
    } catch (err) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, method, from, to]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Open invoice picker (for "Record payment" from /payments) ─────
  const debouncedPicker = useDebounce(pickerQuery, DEBOUNCE);
  useEffect(() => {
    if (!drawerOpen) return;
    setPickerLoading(true);
    listOpenInvoices({ search: debouncedPicker })
      .then((res) => setOpenInvs(res.data || []))
      .catch(() => setOpenInvs([]))
      .finally(() => setPickerLoading(false));
  }, [drawerOpen, debouncedPicker]);

  const handleReset = () => {
    setSearch(''); setMethod(''); setFrom(''); setTo(''); setPage(1);
  };

  const handlePaymentSuccess = () => {
    setDrawerOpen(false);
    setSelectedInv(null);
    setPickerQuery('');
    fetchPayments();
  };

  // ── Columns ───────────────────────────────────────────────────────
  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (val) => (
        <span className="text-sm text-slate-700 whitespace-nowrap">{formatDate(val)}</span>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (val, row) => (
        <Link
          to={`/invoices/${row.invoiceId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-sm font-bold text-brand-600 hover:underline"
        >
          {val}
        </Link>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (val) => <span className="text-slate-700">{val}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (val) => {
        const meta = methodMeta(val);
        const Icon = meta.Icon;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-sm text-slate-700">{val}</span>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (val) => <MoneyText amount={val} size="sm" right tone="positive" />,
    },
    {
      key: 'note',
      header: 'Note',
      render: (val) => <span className="text-xs text-slate-500">{val || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payments"
        subtitle={loading ? 'Loading…' : `${total.toLocaleString('en-IN')} payment${total !== 1 ? 's' : ''}`}
        actions={
          <Button
            variant="primary"
            leftIcon={<CreditCard className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            id="record-payment-page-btn"
          >
            Record payment
          </Button>
        }
      />

      {/* Filters */}
      <FiltersBar onReset={handleReset}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search invoice # or customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-10 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors w-52"
            aria-label="Search payments"
          />
        </div>

        <select
          value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
          aria-label="Filter by method"
        >
          <option value="">All methods</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank</option>
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500 shrink-0">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500 shrink-0">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
          />
        </div>
      </FiltersBar>

      {/* Total collected strip */}
      {!loading && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-slate-500">Total collected (filtered):</span>
          <MoneyText amount={totalAmt} size="sm" tone="positive" />
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        isLoading={loading}
        error={error}
        onRetry={fetchPayments}
        emptyTitle="No payments found"
        emptyMessage="Try adjusting your search or date range filters."
      />

      {/* ── Record Payment Drawer (from /payments with invoice picker) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => { setDrawerOpen(false); setSelectedInv(null); setPickerQuery(''); }}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-soft-lg animate-drawer-in flex flex-col focus:outline-none">
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">Record Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select an invoice, then enter payment details</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDrawerOpen(false); setSelectedInv(null); setPickerQuery(''); }}
                  aria-label="Close drawer"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Invoice Picker */}
                {!selectedInv ? (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 block">Select Invoice</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search open invoices…"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                        autoFocus
                      />
                    </div>

                    {pickerLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <Skeleton key={i} variant="line" height="56px" className="rounded-xl" />)}
                      </div>
                    ) : openInvs.length === 0 ? (
                      <div className="text-sm text-slate-500 text-center py-6">
                        No open invoices with outstanding balance.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {openInvs.map((inv) => (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => setSelectedInv(inv)}
                            className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-mono font-bold text-sm text-slate-900">
                                  {inv.number || inv.invoiceNumber}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{inv.customerName}</p>
                              </div>
                              <MoneyText amount={inv.outstanding} size="sm" tone="negative" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Show the payment form inline by re-using the drawer body logic */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">Invoice selected</p>
                      <button
                        type="button"
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => setSelectedInv(null)}
                      >
                        Change
                      </button>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                      <p className="font-mono font-bold text-slate-900">
                        {selectedInv.number || selectedInv.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedInv.customerName}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      The payment form will open in the drawer below. Click "Record Payment" in the drawer to submit.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual payment drawer — rendered when invoice is selected */}
      {selectedInv && (
        <RecordPaymentDrawer
          isOpen={!!selectedInv}
          onClose={() => { setSelectedInv(null); setDrawerOpen(false); setPickerQuery(''); }}
          invoice={selectedInv}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

/**
 * InvoicesPage — /invoices
 *
 * SQL the backend needs (for reference):
 *   SELECT i.*, CASE WHEN i.due_date < CURRENT_DATE
 *                     AND i.status NOT IN ('Paid','Cancelled')
 *                    THEN 'Overdue' ELSE i.status END AS computed_status,
 *          GREATEST(0, CURRENT_DATE - i.due_date) AS days_overdue
 *   FROM invoices i
 *   WHERE (... search / status / customer / date filters ...)
 *   ORDER BY <sortBy> <sortDir>
 *   LIMIT :pageSize OFFSET :offset;
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Download, FileText, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader   from '../../components/ui/PageHeader';
import FiltersBar   from '../../components/ui/FiltersBar';
import DataTable    from '../../components/ui/DataTable';
import StatCard     from '../../components/ui/StatCard';
import StatusBadge  from '../../components/ui/StatusBadge';
import MoneyText    from '../../components/ui/MoneyText';
import Button       from '../../components/ui/Button';
import EmptyState   from '../../components/ui/EmptyState';
import RunBillingModal from './RunBillingModal';

import { listInvoices, listCustomers } from '../../api/client';
import { formatDate, relativeDue, formatMoney } from '../../utils/format';

const PAGE_SIZE = 10;
const DEBOUNCE  = 300;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function InvoicesPage() {
  const navigate               = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filters from URL ──────────────────────────────────────────────
  const [search,     setSearch]     = useState(searchParams.get('search')     || '');
  const [status,     setStatus]     = useState(searchParams.get('status')     || '');
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [from,       setFrom]       = useState(searchParams.get('from')       || '');
  const [to,         setTo]         = useState(searchParams.get('to')         || '');
  const [page,       setPage]       = useState(Number(searchParams.get('page')) || 1);
  const [sortBy,     setSortBy]     = useState('');
  const [sortDir,    setSortDir]    = useState('asc');

  // ── Data ──────────────────────────────────────────────────────────
  const [invoices,   setInvoices]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Stat cards ────────────────────────────────────────────────────
  const [stats,      setStats]      = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Customers for select ──────────────────────────────────────────
  const [customers,  setCustomers]  = useState([]);

  // ── Modals ────────────────────────────────────────────────────────
  const [billingOpen, setBillingOpen] = useState(
    searchParams.get('runBilling') === '1'
  );

  const debouncedSearch = useDebounce(search, DEBOUNCE);

  // ── Sync URL params ──────────────────────────────────────────────
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (status)          params.status = status;
    if (customerId)      params.customerId = customerId;
    if (from)            params.from = from;
    if (to)              params.to = to;
    if (page > 1)        params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, status, customerId, from, to, page, setSearchParams]);

  // ── Fetch invoices ────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInvoices({
        page, pageSize: PAGE_SIZE,
        search: debouncedSearch, status, customerId, from, to,
        sortBy, sortDir,
      });
      setInvoices(res.data);
      setTotal(res.total);

      // Derive stats from the full (unfiltered) response
      // A lightweight extra call using same filters but no pagination
      setStatsLoading(true);
      const all = await listInvoices({
        page: 1, pageSize: 9999,
        search: debouncedSearch, status, customerId, from, to,
      });
      const data      = all.data || [];
      const billed    = data.reduce((s, i) => s + i.total, 0);
      const outstanding = data.reduce((s, i) => s + (i.outstanding || 0), 0);
      const overdueCnt  = data.filter((i) => i.status === 'Overdue').length;
      setStats({ billed, outstanding, overdueCnt });
      setStatsLoading(false);
    } catch (err) {
      setError(err?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, customerId, from, to, sortBy, sortDir]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── Customers ─────────────────────────────────────────────────────
  useEffect(() => {
    listCustomers({ pageSize: 100 }).then((res) => setCustomers(res.data || []));
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearch(''); setStatus(''); setCustomerId('');
    setFrom(''); setTo(''); setPage(1);
  };

  // ── Table columns ─────────────────────────────────────────────────
  const columns = [
    {
      key: 'number',
      header: 'Invoice #',
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm font-bold text-slate-900">
          {row.number || row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (val) => <span className="text-slate-700">{val}</span>,
    },
    {
      key: 'periodStart',
      header: 'Period',
      render: (_, row) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (val) => <MoneyText amount={val} size="sm" right />,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (val) => (
        <MoneyText amount={val} size="sm" right tone={val > 0 ? 'negative' : 'muted'} />
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (val, row) => {
        const isOverdue = row.status === 'Overdue';
        const rel       = relativeDue(val);
        return (
          <div>
            <p className="text-sm text-slate-700 whitespace-nowrap">{formatDate(val)}</p>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
              {rel}
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => (
        <StatusBadge
          status={val}
          daysOverdue={val === 'Overdue' ? row.daysOverdue : null}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Invoices"
        subtitle={loading ? 'Loading…' : `${total.toLocaleString('en-IN')} invoice${total !== 1 ? 's' : ''}`}
        actions={
          <>
            {/* Export — UI only */}
            <div className="relative group">
              <Button
                variant="secondary"
                leftIcon={<Download className="w-4 h-4" />}
                disabled
                aria-label="Export (coming soon)"
              >
                Export
              </Button>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                Coming soon
              </span>
            </div>

            {/* Run Billing — hero CTA */}
            <Button
              variant="primary"
              leftIcon={<Zap className="w-4 h-4" />}
              onClick={() => setBillingOpen(true)}
              id="run-billing-btn"
            >
              Run Billing
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={FileText}
          iconClassName="bg-brand-50 text-brand-600 border-brand-100"
          label="Total billed (current filter)"
          value={stats?.billed || 0}
          isCurrency
          isLoading={statsLoading}
        />
        <StatCard
          icon={Clock}
          iconClassName="bg-amber-50 text-amber-600 border-amber-100"
          label="Outstanding"
          value={stats?.outstanding || 0}
          isCurrency
          isLoading={statsLoading}
        />
        <StatCard
          icon={AlertCircle}
          iconClassName="bg-rose-50 text-rose-600 border-rose-100"
          label="Overdue invoices"
          value={stats?.overdueCnt || 0}
          isLoading={statsLoading}
        />
      </div>

      {/* Filters */}
      <FiltersBar onReset={handleReset}>
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search invoice # or customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-10 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors w-52"
            aria-label="Search invoices"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Customer */}
        <select
          value={customerId}
          onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors max-w-[180px]"
          aria-label="Filter by customer"
        >
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* From date */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500 shrink-0">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
          />
        </div>

        {/* To date */}
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={invoices}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        isLoading={loading}
        error={error}
        onRetry={fetchInvoices}
        emptyTitle="No invoices match these filters"
        emptyMessage="Try adjusting your search, status filter, or date range."
      />

      {/* Run Billing Modal */}
      <RunBillingModal
        isOpen={billingOpen}
        onClose={() => setBillingOpen(false)}
        onDone={fetchInvoices}
      />
    </div>
  );
}

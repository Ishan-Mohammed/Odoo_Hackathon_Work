/**
 * Subscriptions List Page
 * ============================================================
 * Backend SQL reference:
 * SELECT s.id, s.number, s.customer_id, u.name as customer_name,
 *        s.plan_id, p.name as plan_name, s.status, s.start_date,
 *        s.expiry_date, s.next_billing_date,
 *        COALESCE(SUM(sl.qty * sl.unit_price), 0) as amount
 * FROM subscriptions s
 * JOIN users u ON u.id = s.customer_id
 * JOIN plans p ON p.id = s.plan_id
 * LEFT JOIN subscription_lines sl ON sl.subscription_id = s.id
 * WHERE ($1::text IS NULL OR s.status = $1)
 * GROUP BY s.id, u.name, p.name
 * ORDER BY s.id DESC
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Layers, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FiltersBar from '../../components/ui/FiltersBar';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import { listSubscriptions, listPlans, listCustomers } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const plan = searchParams.get('plan') || '';
  const customer = searchParams.get('customer') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 10;

  // Data state
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options
  const [plansList, setPlansList] = useState([]);
  const [customersList, setCustomersList] = useState([]);

  useEffect(() => {
    Promise.all([listPlans(), listCustomers()])
      .then(([pRes, cRes]) => {
        setPlansList(pRes?.data || []);
        setCustomersList(cRes?.data || []);
      })
      .catch((err) => console.error('Error fetching filter options:', err));
  }, []);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listSubscriptions({ page, pageSize, search, status, plan, customer });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, status, plan, customer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      key: 'subscriptionNumber',
      header: 'Number',
      render: (row) => (
        <span className="font-semibold text-brand-600 hover:text-brand-700">
          {row.subscriptionNumber || row.number || `SUB-${row.id}`}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div className="font-medium text-slate-900">{row.customerName || 'Acme Traders'}</div>
      ),
    },
    {
      key: 'planName',
      header: 'Plan',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.planName || 'CRM Monthly'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row) => (
        <span className="text-slate-600 text-xs">{formatDate(row.startDate || row.start_date)}</span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (row) => (
        <span className="text-slate-600 text-xs">
          {row.expiryDate || row.expiry_date ? formatDate(row.expiryDate || row.expiry_date) : '—'}
        </span>
      ),
    },
    {
      key: 'nextBillingDate',
      header: 'Next Billing',
      render: (row) => (
        <span className="text-slate-700 text-xs font-medium">
          {row.nextBillingDate || row.next_billing_date ? formatDate(row.nextBillingDate || row.next_billing_date) : '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => {
        const amt = row.amount || (row.seats && row.unitPrice ? row.seats * row.unitPrice : 0);
        return <MoneyText amount={amt} className="font-semibold text-slate-900 text-sm" />;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        subtitle="Manage recurring customer contracts, plans, billing frequencies, and status lifecycles"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Link to="/subscriptions/new">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                New Subscription
              </Button>
            </Link>
          </div>
        }
      />

      <FiltersBar onReset={resetFilters} showReset={Boolean(search || status || plan || customer)}>
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SUB number or customer..."
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          aria-label="Filter by Status"
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Quotation">Quotation</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Plan Select */}
        <select
          value={plan}
          onChange={(e) => updateParam('plan', e.target.value)}
          aria-label="Filter by Plan"
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        >
          <option value="">All Plans</option>
          {plansList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Customer Select */}
        <select
          value={customer}
          onChange={(e) => updateParam('customer', e.target.value)}
          aria-label="Filter by Customer"
          className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        >
          <option value="">All Customers</option>
          {customersList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FiltersBar>

      <DataTable
        columns={columns}
        data={data}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => {
          const next = new URLSearchParams(searchParams);
          next.set('page', String(p));
          setSearchParams(next);
        }}
        onRowClick={(row) => navigate(`/subscriptions/${row.id}`)}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        emptyTitle="No subscriptions found"
        emptyMessage="Try adjusting your search criteria or create a new subscription order."
      />
    </div>
  );
}

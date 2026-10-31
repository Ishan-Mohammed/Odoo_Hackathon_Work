import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCw,
  Zap,
  Repeat,
  CreditCard,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import MoneyText from '../components/ui/MoneyText';
import ErrorState from '../components/ui/ErrorState';

import DashboardFilters from './dashboard/DashboardFilters';
import { computePresetRange } from './dashboard/datePresets';
import RevenueChart from './dashboard/RevenueChart';
import StatusDonut from './dashboard/StatusDonut';
import OverdueTable from './dashboard/OverdueTable';

import { getDashboard, getOverdueInvoices } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FEATURES } from '../config/features';

/**
 * =====================================================================
 * BACKEND PERFORMANCE NOTE: SQL SINGLE-QUERY AGGREGATION PATTERN
 * =====================================================================
 * For real backend implementation with 2,500+ subscriptions:
 * To maintain sub-200ms latency, the backend must avoid row iteration loops.
 * Execute ONE single optimized query returning JSON directly via PostgreSQL:
 *
 * SELECT json_build_object(
 *   'stats', (
 *     SELECT json_build_object(
 *       'activeSubscriptions', COUNT(*) FILTER (WHERE status = 'Active'),
 *       'revenueCollected', COALESCE(SUM(amount) FILTER (WHERE status = 'Paid'), 0),
 *       'outstanding', COALESCE(SUM(amount) FILTER (WHERE status IN ('Confirmed', 'Overdue')), 0),
 *       'overdueCount', COUNT(*) FILTER (WHERE status = 'Overdue'),
 *       'overdueAmount', COALESCE(SUM(amount) FILTER (WHERE status = 'Overdue'), 0)
 *     ) FROM invoices WHERE (:customer_id IS NULL OR customer_id = :customer_id)
 *   ),
 *   'revenueByMonth', (
 *     SELECT json_agg(m ORDER BY m.month) FROM (
 *       SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
 *              to_char(date_trunc('month', paid_at), 'Mon') as label,
 *              SUM(amount) as revenue
 *       FROM invoices WHERE status = 'Paid'
 *       GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 12
 *     ) m
 *   ),
 *   'statusBreakdown', (
 *     SELECT json_agg(s) FROM (
 *       SELECT status, COUNT(*) as count FROM invoices GROUP BY status
 *     ) s
 *   )
 * );
 * =====================================================================
 */

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filters, setFilters] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());

  // Overdue table pagination
  const [overduePage, setOverduePage] = useState(1);
  const [overdueData, setOverdueData] = useState([]);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [isOverdueLoading, setIsOverdueLoading] = useState(false);

  // Fetch Dashboard Summary
  const fetchDashboard = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDashboard(activeFilters);
      setDashboardData(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to retrieve dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch paginated overdue invoices
  const fetchOverdue = useCallback(async (activeFilters, page) => {
    setIsOverdueLoading(true);
    try {
      const res = await getOverdueInvoices({
        page,
        pageSize: 5,
        from: activeFilters.from,
        to: activeFilters.to,
        customerId: activeFilters.customerId,
      });
      setOverdueData(res.data || []);
      setOverdueTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load overdue invoices:', err);
    } finally {
      setIsOverdueLoading(false);
    }
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setOverduePage(1);
      fetchDashboard(newFilters);
      fetchOverdue(newFilters, 1);
    },
    [fetchDashboard, fetchOverdue]
  );

  const handleRefresh = () => {
    fetchDashboard(filters);
    fetchOverdue(filters, overduePage);
  };

  const handlePageChange = (newPage) => {
    setOverduePage(newPage);
    fetchOverdue(filters, newPage);
  };

  const stats = dashboardData?.stats;
  const dateRangeLabel =
    filters.preset && filters.preset !== 'custom'
      ? computePresetRange(filters.preset).label
      : filters.from && filters.to
      ? `${filters.from} to ${filters.to}`
      : 'All time view';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle={`Hi, ${user?.name || 'there'} • Period: ${dateRangeLabel}`}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/invoices?runBilling=1')}
              leftIcon={<Zap className="w-3.5 h-3.5" />}
            >
              Run Billing
            </Button>
          </div>
        }
      />

      {/* 2. Filters Bar */}
      <DashboardFilters onFiltersChange={handleFiltersChange} />

      {error ? (
        <ErrorState message={error} onRetry={handleRefresh} />
      ) : (
        <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-80' : 'opacity-100'}`}>
          {/* 3. StatCards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Repeat}
              iconClassName="bg-indigo-50 text-indigo-600 border-indigo-100"
              label="Active Subscriptions"
              value={stats?.activeSubscriptions ?? 0}
              isLoading={isLoading}
              onClick={FEATURES.subscriptionsAdmin ? () => navigate('/subscriptions?status=Active') : undefined}
            />

            <StatCard
              icon={CreditCard}
              iconClassName="bg-teal-50 text-teal-600 border-teal-100"
              label="Revenue Collected"
              value={stats?.revenueCollected ?? 0}
              isCurrency
              isLoading={isLoading}
              onClick={() =>
                navigate(
                  `/payments?from=${encodeURIComponent(filters.from || '')}&to=${encodeURIComponent(
                    filters.to || ''
                  )}`
                )
              }
            />

            <StatCard
              icon={Clock}
              iconClassName="bg-amber-50 text-amber-600 border-amber-100"
              label="Outstanding Invoices"
              value={stats?.outstanding ?? 0}
              isCurrency
              isLoading={isLoading}
              onClick={() => navigate('/invoices?status=Confirmed')}
            />

            <StatCard
              icon={AlertTriangle}
              iconClassName="bg-rose-50 text-rose-600 border-rose-100"
              label="Overdue Invoices"
              value={stats?.overdueCount ?? 0}
              subline={
                <span className="text-xs text-rose-600 font-medium">
                  Total: <MoneyText amount={stats?.overdueAmount ?? 0} size="xs" tone="negative" />
                </span>
              }
              isLoading={isLoading}
              onClick={() => navigate('/invoices?status=Overdue')}
            />
          </div>

          {/* 4. Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevenueChart data={dashboardData?.revenueByMonth || []} isLoading={isLoading} />
            <StatusDonut data={dashboardData?.statusBreakdown || []} isLoading={isLoading} />
          </div>

          {/* 5. Overdue Invoices Table */}
          <OverdueTable
            invoices={overdueData}
            total={overdueTotal}
            page={overduePage}
            pageSize={5}
            onPageChange={handlePageChange}
            isLoading={isOverdueLoading}
          />

          {/* 6. Footer Line */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <RotateCw className="w-3 h-3" />
              <span>Last updated: {lastUpdated}</span>
            </div>
            <span>Auto-synced with recurring billing ledger</span>
          </div>
        </div>
      )}
    </div>
  );
}

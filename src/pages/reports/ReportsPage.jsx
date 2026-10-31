import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Repeat,
  CreditCard,
  Clock,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import DashboardFilters from '../dashboard/DashboardFilters';
import RevenueChart from '../dashboard/RevenueChart';
import StatusDonut from '../dashboard/StatusDonut';
import OverdueTable from '../dashboard/OverdueTable';
import { getDashboard, getOverdueInvoices } from '../../api/client';
import { formatMoney, formatDate } from '../../utils/format';

export default function ReportsPage() {
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overdue table state
  const [overduePage, setOverduePage] = useState(1);
  const [overdueData, setOverdueData] = useState([]);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [isOverdueLoading, setIsOverdueLoading] = useState(false);

  // Fetch Dashboard Summary Data
  const fetchReportSummary = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboard(activeFilters);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Unable to generate analytics report.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Paginated Overdue Invoices
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
      console.error('Failed to load overdue report items:', err);
    } finally {
      setIsOverdueLoading(false);
    }
  }, []);

  // Filter change callback from DashboardFilters
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setOverduePage(1);
      fetchReportSummary(newFilters);
      fetchOverdue(newFilters, 1);
    },
    [fetchReportSummary, fetchOverdue]
  );

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      fetchOverdue(filters, overduePage);
    }
  }, [overduePage, fetchOverdue, filters]);

  // Client-side CSV Export from Overdue invoices
  const handleExportCSV = () => {
    const rows = overdueData.length > 0 ? overdueData : reportData?.overdueInvoices || [];
    if (!rows || rows.length === 0) {
      toast.error('No overdue invoices to export.');
      return;
    }

    const headers = ['Invoice Number', 'Customer Name', 'Total Amount', 'Outstanding', 'Due Date', 'Days Overdue', 'Status'];
    const csvRows = [headers.join(',')];

    rows.forEach((inv) => {
      const row = [
        `"${inv.number || inv.invoiceNumber || ''}"`,
        `"${(inv.customerName || inv.customer?.name || '').replace(/"/g, '""')}"`,
        inv.total ?? 0,
        inv.outstanding ?? 0,
        `"${inv.dueDate || ''}"`,
        inv.daysOverdue ?? 0,
        `"${inv.status || 'Overdue'}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `brightloop_overdue_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} overdue records to CSV`);
  };

  const stats = reportData?.stats || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Revenue performance, customer collection risk, and overdue invoice auditing"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchReportSummary(filters);
                fetchOverdue(filters, overduePage);
              }}
              disabled={isLoading}
              className="gap-2"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Bar with Presets & URL search params */}
      <DashboardFilters onFiltersChange={handleFiltersChange} />

      {/* 4 Primary Metric StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Repeat}
          iconClassName="bg-blue-50 text-blue-600 border-blue-100"
          label="Active Subscriptions"
          value={stats.activeSubscriptions ?? 0}
          isLoading={isLoading}
          subline="Live revenue-generating contracts"
        />
        <StatCard
          icon={CreditCard}
          iconClassName="bg-emerald-50 text-emerald-600 border-emerald-100"
          label="Revenue Collected"
          value={stats.revenueCollected ?? stats.revenue ?? 0}
          isCurrency
          isLoading={isLoading}
          subline="Settled within period"
        />
        <StatCard
          icon={Clock}
          iconClassName="bg-amber-50 text-amber-600 border-amber-100"
          label="Outstanding Total"
          value={stats.outstanding ?? 0}
          isCurrency
          isLoading={isLoading}
          subline="Unpaid confirmed balances"
        />
        <StatCard
          icon={AlertTriangle}
          iconClassName="bg-rose-50 text-rose-600 border-rose-100"
          label="Overdue Receivables"
          value={stats.overdueAmount ?? stats.overdueCount ?? 0}
          isCurrency
          isLoading={isLoading}
          subline={`${stats.overdueCount ?? 0} overdue invoices`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={reportData?.revenueByMonth || []} isLoading={isLoading} />
        </div>
        <div>
          <StatusDonut data={reportData?.statusBreakdown || []} isLoading={isLoading} />
        </div>
      </div>

      {/* Overdue Audit Table with Export capability */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 tracking-tight">
              Overdue Collections Audit
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeted list of unpaid invoices past due date
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs text-brand-600 hover:text-brand-700 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download table as CSV
          </Button>
        </div>

        <OverdueTable
          invoices={overdueData}
          total={overdueTotal}
          page={overduePage}
          pageSize={5}
          onPageChange={setOverduePage}
          isLoading={isOverdueLoading}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Skeleton from '../../components/ui/Skeleton';
import { listMyInvoices } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMyInvoices();
      setInvoices(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to retrieve invoice history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="line" width="220px" height="28px" />
        <Skeleton variant="card" height="300px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={error} onRetry={fetchInvoices} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/portal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            My Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Billing history, settled receipts, and outstanding dues
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchInvoices}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Receipt}
              title="No Invoices Yet"
              message="You do not have any invoices billed to your account."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Billing Period</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Paid</th>
                  <th className="px-6 py-3 text-right">Outstanding</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                      {inv.number || inv.invoiceNumber || inv.id}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-mono">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium">
                      <MoneyText amount={inv.total || 0} size="sm" right />
                    </td>
                    <td className="px-6 py-3.5 text-right text-emerald-600 font-medium">
                      <MoneyText amount={inv.paidAmount || 0} size="sm" tone="positive" right />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <MoneyText
                        amount={inv.outstanding || 0}
                        size="sm"
                        tone={inv.outstanding > 0 ? 'negative' : 'muted'}
                        right
                      />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} daysOverdue={inv.daysOverdue} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs font-mono">
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Repeat,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getMyPortalSummary, listMySubscriptions } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function PortalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, subRes] = await Promise.all([
        getMyPortalSummary(),
        listMySubscriptions(),
      ]);
      setSummary(sumRes);
      setSubscriptions(subRes?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to retrieve customer portal data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="line" width="220px" height="28px" />
        <Skeleton variant="card" height="90px" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton variant="card" height="100px" />
          <Skeleton variant="card" height="100px" />
          <Skeleton variant="card" height="100px" />
        </div>
        <Skeleton variant="card" height="260px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={error} onRetry={fetchPortalData} />
      </div>
    );
  }

  const amountOwed = summary?.amountOwed ?? summary?.outstandingTotal ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Hi, {user?.name || summary?.customerName || 'Customer'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your service plans, renewals, and view billing receipts
          </p>
        </div>

        <Link to="/portal/invoices">
          <Button variant="secondary" size="sm" className="gap-2">
            <Receipt className="w-4 h-4" />
            View Invoices
          </Button>
        </Link>
      </div>

      {/* Dynamic Billing Status Banner */}
      {amountOwed > 0.005 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                You owe <MoneyText amount={amountOwed} size="sm" tone="negative" inline />
              </p>
              <p className="text-xs text-amber-700/90 mt-0.5">
                You have {summary?.overdueCount || 0} invoice(s) pending payment. Please settle dues promptly.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/portal/invoices')}
            className="shrink-0 gap-1.5 self-start sm:self-center"
          >
            Review Invoices <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center gap-3.5 shadow-soft-xs">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">You&apos;re all paid up</p>
            <p className="text-xs text-emerald-700/90 mt-0.5">
              All your invoices are settled. Your services are active with no pending dues.
            </p>
          </div>
        </div>
      )}

      {/* 3 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Repeat}
          iconClassName="bg-indigo-50 text-indigo-600 border-indigo-100"
          label="Active Subscriptions"
          value={summary?.activeSubscriptions ?? subscriptions.length}
          subline="Live SaaS recurring services"
        />
        <StatCard
          icon={CreditCard}
          iconClassName="bg-amber-50 text-amber-600 border-amber-100"
          label="Amount Owed"
          value={amountOwed}
          isCurrency
          subline="Unpaid balances across open invoices"
        />
        <StatCard
          icon={Calendar}
          iconClassName="bg-teal-50 text-teal-600 border-teal-100"
          label="Next Billing Date"
          value={summary?.nextBillingDate ? formatDate(summary.nextBillingDate) : 'None scheduled'}
          subline="Upcoming cycle renewal"
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-slate-900">
            Your Subscriptions
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {subscriptions.length} contracts
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Repeat}
              title="No Active Subscriptions"
              message="You do not have any active subscriptions yet."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Contract #</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3 text-center">Seats</th>
                  <th className="px-6 py-3 text-right">Amount / Period</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Next Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                      {sub.subscriptionNumber || sub.number || sub.id}
                    </td>
                    <td className="px-6 py-3.5 text-slate-800 font-medium">
                      {sub.planName || sub.plan?.name || 'CRM Subscription'}
                    </td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-mono">
                      {sub.seats || 1}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium">
                      <MoneyText amount={sub.amount || sub.mrr || 0} size="sm" right />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs font-mono">
                      {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '—'}
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

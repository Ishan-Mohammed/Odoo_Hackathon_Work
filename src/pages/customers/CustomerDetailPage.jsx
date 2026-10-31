import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Repeat,
  CreditCard,
  Clock,
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { getCustomer } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'invoices' | 'payments'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCustomer(id);
      if (!data) {
        setError('Customer not found');
      } else {
        setCustomer(data);
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve customer details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton variant="line" width="180px" height="16px" />
        <Skeleton variant="line" width="300px" height="32px" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton variant="card" height="110px" />
          <Skeleton variant="card" height="110px" />
          <Skeleton variant="card" height="110px" />
        </div>
        <Skeleton variant="card" height="300px" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <EmptyState
          icon={Users}
          title="Customer Profile Not Found"
          message={error || `Customer ID "${id}" does not exist in the database.`}
          action={
            <Button variant="primary" onClick={() => navigate('/customers')}>
              Back to Customer List
            </Button>
          }
        />
      </div>
    );
  }

  const subscriptions = customer.subscriptions || [];
  const invoices = customer.invoices || [];
  const payments = customer.payments || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title={customer.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
            {customer.email && (
              <span className="flex items-center gap-1 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {customer.email}
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone}
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.address}
              </span>
            )}
          </div>
        }
        breadcrumb={[
          { label: 'Customers', href: '/customers' },
          { label: customer.name },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/customers')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            All Customers
          </Button>
        }
      />

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={Repeat}
          iconClassName="bg-indigo-50 text-indigo-600 border-indigo-100"
          label="Active Subscriptions"
          value={customer.activeSubscriptions || 0}
          subline="Recurring service contracts"
        />
        <StatCard
          icon={Clock}
          iconClassName="bg-rose-50 text-rose-600 border-rose-100"
          label="Outstanding Balance"
          value={customer.outstanding || 0}
          isCurrency
          subline="Unpaid and confirmed dues"
        />
        <StatCard
          icon={CreditCard}
          iconClassName="bg-emerald-50 text-emerald-600 border-emerald-100"
          label="Total Paid"
          value={customer.totalPaid || 0}
          isCurrency
          subline="Lifetime settled receipts"
        />
      </div>

      {/* Tabs Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 pt-3 bg-slate-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Subscriptions
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {subscriptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Invoices
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payments
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {payments.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            subscriptions.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Repeat}
                  title="No Subscriptions"
                  message="This customer currently has no subscription contracts."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Number</th>
                      <th className="px-6 py-3">Plan</th>
                      <th className="px-6 py-3 text-center">Seats</th>
                      <th className="px-6 py-3 text-right">Amount / MRR</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Next Billing</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {subscriptions.map((sub) => (
                      <tr
                        key={sub.id}
                        onClick={() => navigate(`/subscriptions/${sub.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-3.5 font-mono font-medium text-slate-900 group-hover:text-brand-600">
                          {sub.subscriptionNumber || sub.number || sub.id}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">
                          {sub.planName || sub.plan?.name || 'CRM Subscription'}
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-600">
                          {sub.seats || 1}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium">
                          <MoneyText amount={sub.amount || sub.mrr || 0} size="sm" right />
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {formatDate(sub.nextBillingDate)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="text-slate-400 group-hover:text-brand-600 transition-colors">
                            <ExternalLink className="w-4 h-4 inline" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            invoices.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Clock}
                  title="No Invoices"
                  message="No invoices have been billed to this customer."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Invoice #</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3 text-right">Paid</th>
                      <th className="px-6 py-3 text-right">Outstanding</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-3.5 font-mono font-medium text-slate-900 group-hover:text-brand-600">
                          {inv.number || inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium">
                          <MoneyText amount={inv.total || 0} size="sm" right />
                        </td>
                        <td className="px-6 py-3.5 text-right text-slate-600">
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
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="text-slate-400 group-hover:text-brand-600 transition-colors">
                            <ExternalLink className="w-4 h-4 inline" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            payments.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={CreditCard}
                  title="No Payments Recorded"
                  message="No payment transactions found for this customer."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Receipt / Ref</th>
                      <th className="px-6 py-3">Invoice #</th>
                      <th className="px-6 py-3">Payment Method</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3">Payment Date</th>
                      <th className="px-6 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {payments.map((pay, idx) => (
                      <tr key={pay.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700">
                          {pay.id || `PAY-${idx + 1}`}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-900 font-medium">
                          {pay.invoiceNumber || pay.invoiceId || '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                            {pay.method || 'UPI'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium">
                          <MoneyText amount={pay.amount || 0} size="sm" tone="positive" right />
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {formatDate(pay.date)}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500 italic">
                          {pay.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

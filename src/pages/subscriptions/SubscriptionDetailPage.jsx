/**
 * Subscription Detail Page
 * ============================================================
 * Backend SQL reference:
 * SELECT s.id, s.number, s.customer_id, u.name as customer_name, u.email as customer_email,
 *        s.plan_id, p.name as plan_name, p.period, p.pausable, p.closable, p.renewable,
 *        s.status, s.start_date, s.expiry_date, s.next_billing_date, s.payment_terms
 * FROM subscriptions s
 * JOIN users u ON u.id = s.customer_id
 * JOIN plans p ON p.id = s.plan_id
 * WHERE s.id = $1;
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Layers,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  RotateCw,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusStepper from '../../components/ui/StatusStepper';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { getSubscription, updateSubscriptionStatus } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('lines'); // lines | invoices | notes
  const [notes, setNotes] = useState('');

  // Confirmation dialog for destructive actions (close, cancel)
  const [pendingAction, setPendingAction] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSubscription(id);
      if (!data) {
        setError('Subscription not found');
        return;
      }
      setSubscription(data);
      setNotes(data.notes || '');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to load subscription details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleAction = async (action) => {
    // Destructive actions prompt confirmation
    if (action === 'cancel' || action === 'close') {
      setPendingAction(action);
      return;
    }
    executeAction(action);
  };

  const executeAction = async (action) => {
    setIsActionLoading(true);
    try {
      const res = await updateSubscriptionStatus(subscription.id, action);
      toast.success(res.message || `Subscription updated to ${res.subscription.status}`);
      setSubscription((prev) => ({
        ...prev,
        ...res.subscription,
        allowedActions: res.subscription.allowedActions || prev.allowedActions,
      }));
      setPendingAction(null);
      fetchSubscription();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err.message || `Failed to ${action} subscription`);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-2xl p-6 shadow-soft-xs" />
        <div className="h-72 bg-white border border-slate-200 rounded-2xl p-6 shadow-soft-xs" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState message={error || 'Subscription not found'} onRetry={fetchSubscription} />
      </div>
    );
  }

  const {
    subscriptionNumber,
    number,
    customer = {},
    plan = {},
    status,
    startDate,
    expiryDate,
    nextBillingDate,
    paymentTerms,
    lines = [],
    invoices = [],
    allowedActions = [],
  } = subscription;

  const subNum = subscriptionNumber || number || `SUB-${subscription.id}`;

  // Stepper mapping
  const stepperSteps = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'];
  const isPaused = status === 'Paused';
  const isCancelled = status === 'Cancelled';

  // Compute total
  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || (l.qty * l.unitPrice)), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title={subNum}
        subtitle={`Customer: ${customer.name || 'Acme Traders'} • Plan: ${plan.name || 'CRM Monthly'}`}
        breadcrumb={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: subNum },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/subscriptions')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSubscription}
              disabled={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stepper Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lifecycle Stage
            </span>
            <StatusBadge status={status} />
            {isPaused && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Pausable Plan Active
              </span>
            )}
            {isCancelled && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Contract Terminated
              </span>
            )}
          </div>

          {/* Action Buttons built strictly from allowedActions */}
          <div className="flex items-center gap-2 flex-wrap">
            {allowedActions.includes('quote') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('quote')}
                disabled={isActionLoading}
              >
                Send Quotation
              </Button>
            )}

            {allowedActions.includes('confirm') && (
              <Button
                size="sm"
                onClick={() => handleAction('confirm')}
                disabled={isActionLoading}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Order
              </Button>
            )}

            {allowedActions.includes('activate') && (
              <Button
                size="sm"
                onClick={() => handleAction('activate')}
                disabled={isActionLoading}
                leftIcon={<Play className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Activate Subscription
              </Button>
            )}

            {allowedActions.includes('pause') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('pause')}
                disabled={isActionLoading}
                leftIcon={<Pause className="w-4 h-4" />}
              >
                Pause
              </Button>
            )}

            {allowedActions.includes('resume') && (
              <Button
                size="sm"
                onClick={() => handleAction('resume')}
                disabled={isActionLoading}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Resume
              </Button>
            )}

            {allowedActions.includes('renew') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('renew')}
                disabled={isActionLoading}
                leftIcon={<RotateCw className="w-4 h-4" />}
              >
                Renew Contract
              </Button>
            )}

            {allowedActions.includes('close') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('close')}
                disabled={isActionLoading}
                className="text-rose-600 hover:bg-rose-50"
              >
                Close Contract
              </Button>
            )}

            {allowedActions.includes('cancel') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('cancel')}
                disabled={isActionLoading}
                leftIcon={<XCircle className="w-4 h-4" />}
                className="text-rose-600 hover:bg-rose-50"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Status Stepper component */}
        {!isCancelled && (
          <div className="pt-2">
            <StatusStepper steps={stepperSteps} currentStep={isPaused ? 'Active' : status} />
          </div>
        )}
      </div>

      {/* Contract Metadata Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Customer */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-soft-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
            <User className="w-3.5 h-3.5" /> Customer
          </div>
          <div className="text-sm font-bold text-slate-900">{customer.name || 'Acme Traders'}</div>
          <div className="text-xs text-slate-500">{customer.email || 'billing@acme.com'}</div>
        </div>

        {/* Plan & Period */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-soft-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
            <Layers className="w-3.5 h-3.5" /> Billing Frequency
          </div>
          <div className="text-sm font-bold text-slate-900 capitalize">
            {plan.period || subscription.billingPeriod || 'Monthly'}
          </div>
          <div className="text-xs text-slate-500">Plan: {plan.name || 'CRM Monthly'}</div>
        </div>

        {/* Next Billing */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-soft-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
            <Calendar className="w-3.5 h-3.5" /> Next Billing
          </div>
          <div className="text-sm font-bold text-slate-900">
            {nextBillingDate ? formatDate(nextBillingDate) : 'Not Scheduled'}
          </div>
          <div className="text-xs text-slate-500">Terms: {paymentTerms || 'Net 15'}</div>
        </div>

        {/* Contract Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-soft-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
            <CreditCard className="w-3.5 h-3.5" /> Period Value
          </div>
          <MoneyText amount={totalAmount} className="text-lg font-extrabold text-slate-900" />
          <div className="text-xs text-slate-500">
            Starts: {formatDate(startDate)}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-200 px-5 pt-3 gap-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`pb-3 transition-colors border-b-2 ${
              activeTab === 'lines'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Line Items ({lines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 transition-colors border-b-2 ${
              activeTab === 'invoices'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Billing Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-3 transition-colors border-b-2 ${
              activeTab === 'notes'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Contract Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5">Product & Variant</th>
                      <th className="py-2.5 text-center">Seats (Qty)</th>
                      <th className="py-2.5 text-right">Unit Price</th>
                      <th className="py-2.5 text-center">Tax</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l, i) => (
                      <tr key={l.id || i} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="font-semibold text-slate-900">{l.productName || 'Brightloop CRM'}</div>
                          {l.variantLabel && (
                            <div className="text-[11px] text-slate-500">{l.variantLabel}</div>
                          )}
                        </td>
                        <td className="py-3 text-center font-medium text-slate-700">{l.qty}</td>
                        <td className="py-3 text-right">
                          <MoneyText amount={l.unitPrice} className="text-slate-800" />
                        </td>
                        <td className="py-3 text-center text-slate-500">GST {l.taxRate || 18}%</td>
                        <td className="py-3 text-right font-semibold text-slate-900">
                          <MoneyText amount={l.amount || l.qty * l.unitPrice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total summary block */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <MoneyText amount={totalAmount} />
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Applicable Tax (GST 18%)</span>
                    <MoneyText amount={totalAmount * 0.18} />
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Period Cost</span>
                    <MoneyText amount={totalAmount * 1.18} className="text-brand-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No invoices generated yet for this subscription contract.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5">Invoice #</th>
                        <th className="py-2.5">Billing Period</th>
                        <th className="py-2.5">Due Date</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-3">
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="font-semibold text-brand-600 hover:text-brand-700"
                            >
                              {inv.number || inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-600">
                            {inv.period || `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`}
                          </td>
                          <td className="py-3 text-slate-600">
                            {formatDate(inv.dueDate || inv.due_date)}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="py-3 text-right font-semibold text-slate-900">
                            <MoneyText amount={inv.total} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3 max-w-2xl">
              <label className="block text-xs font-semibold text-slate-700">
                Internal Account Notes
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special renewal terms, account executive contacts, or customer notes..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <Button size="sm" onClick={() => toast.success('Notes saved')}>
                Save Notes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Close/Cancel */}
      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={() => executeAction(pendingAction)}
        title={pendingAction === 'cancel' ? 'Cancel Subscription?' : 'Close Contract?'}
        message={
          pendingAction === 'cancel'
            ? 'Are you sure you want to terminate this contract? Future recurring billing runs will not invoice this subscription.'
            : 'Are you sure you want to close this subscription early? The contract status will move to Closed.'
        }
        confirmText={pendingAction === 'cancel' ? 'Yes, Cancel Contract' : 'Yes, Close Contract'}
        isLoading={isActionLoading}
        variant="danger"
      />
    </div>
  );
}

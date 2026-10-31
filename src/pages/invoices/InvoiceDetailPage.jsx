/**
 * InvoiceDetailPage — /invoices/:id
 *
 * SQL the backend needs:
 *   SELECT i.*, ... FROM invoices i WHERE i.id = :id;
 *   SELECT * FROM invoice_lines WHERE invoice_id = :id ORDER BY sort_order;
 *   SELECT * FROM payments WHERE invoice_id = :id ORDER BY date DESC;
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Send, Printer, Download, CreditCard, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader       from '../../components/ui/PageHeader';
import StatusBadge      from '../../components/ui/StatusBadge';
import StatusStepper    from '../../components/ui/StatusStepper';
import MoneyText        from '../../components/ui/MoneyText';
import Button           from '../../components/ui/Button';
import Skeleton         from '../../components/ui/Skeleton';
import EmptyState       from '../../components/ui/EmptyState';
import ErrorState       from '../../components/ui/ErrorState';
import ConfirmDialog    from '../../components/ui/ConfirmDialog';
import InvoiceDocument  from './InvoiceDocument';
import RecordPaymentDrawer from './RecordPaymentDrawer';
import { methodMeta }   from './PaymentMethodPicker';
import './print.css';

import {
  getInvoice, confirmInvoice, cancelInvoice, sendInvoice,
} from '../../api/client';
import { formatDate, relativeDue } from '../../utils/format';

// Invoice status → stepper steps + index
function getStepperState(status) {
  if (status === 'Cancelled') {
    return { steps: ['Draft', 'Confirmed', 'Cancelled'], currentStep: 2 };
  }
  return {
    steps: ['Draft', 'Confirmed', 'Paid'],
    currentStep: status === 'Draft' ? 0 : status === 'Confirmed' ? 1 : 2,
  };
}

// Skeleton placeholder for the full page
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="h-16 w-full bg-slate-100 rounded-xl" />
      <div className="h-64 w-full bg-slate-100 rounded-2xl" />
      <div className="h-32 w-full bg-slate-100 rounded-2xl" />
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [invoice,        setInvoice]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [notFound,       setNotFound]       = useState(false);

  const [actionLoading,  setActionLoading]  = useState(null); // 'confirm' | 'cancel' | 'send'
  const [cancelOpen,     setCancelOpen]     = useState(false);
  const [paymentOpen,    setPaymentOpen]    = useState(false);
  const [justPaid,       setJustPaid]       = useState(false); // ribbon flash

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getInvoice(id);
      if (!data) { setNotFound(true); return; }
      setInvoice(data);
    } catch (err) {
      setError(err?.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  // ── Actions ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setActionLoading('confirm');
    try {
      const { invoice: updated } = await confirmInvoice(id);
      setInvoice(updated);
      toast.success('Invoice confirmed');
    } catch (err) {
      toast.error(err?.message || 'Could not confirm invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setCancelOpen(false);
    setActionLoading('cancel');
    try {
      const { invoice: updated } = await cancelInvoice(id);
      setInvoice(updated);
      toast.success('Invoice cancelled');
    } catch (err) {
      toast.error(err?.message || 'Could not cancel invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    setActionLoading('send');
    try {
      await sendInvoice(id);
      toast.success(`Invoice sent to ${invoice?.customer?.email || 'customer'}`);
    } catch (err) {
      toast.error(err?.message || 'Could not send invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentSuccess = (payment, updatedInvoice) => {
    setInvoice(updatedInvoice);
    setJustPaid(true);
    setTimeout(() => setJustPaid(false), 2500);
  };

  // ── Edge states ───────────────────────────────────────────────────
  if (loading)  return <div className="space-y-6 p-2"><PageSkeleton /></div>;
  if (notFound) return (
    <ErrorState
      message={`Invoice "${id}" does not exist.`}
      onRetry={() => navigate('/invoices')}
    />
  );
  if (error) return <ErrorState message={error} onRetry={fetchInvoice} />;
  if (!invoice) return null;

  const invNumber    = invoice.number || invoice.invoiceNumber;
  const status       = invoice.status;
  const { steps, currentStep } = getStepperState(status);
  const canConfirm   = status === 'Draft';
  const canCancel    = status === 'Draft' || status === 'Confirmed';
  const canPay       = status === 'Confirmed' || status === 'Overdue';
  const canSend      = status === 'Confirmed' || status === 'Paid' || status === 'Overdue';

  return (
    <>
      {/* Breadcrumb + title */}
      <PageHeader
        breadcrumb={[
          { label: 'Invoices', href: '/invoices' },
          { label: invNumber },
        ]}
        title={invNumber}
        subtitle={`${invoice.customerName} · ${invoice.periodStart ? `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}` : ''}`}
      />

      {/* Status stepper */}
      <div className="mb-6">
        <StatusStepper steps={steps} currentStep={currentStep} />
        {status === 'Cancelled' && (
          <p className="mt-2 text-xs text-red-500 font-medium text-center">
            This invoice has been cancelled and cannot be modified.
          </p>
        )}
      </div>

      {/* ── Sticky Action Bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-3 mb-6 bg-white/90 backdrop-blur-sm border-b border-slate-100 flex flex-wrap items-center gap-2.5 print:hidden no-print">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <StatusBadge status={status} daysOverdue={invoice.daysOverdue} size="lg" />
          {status === 'Overdue' && (
            <span className="text-xs text-rose-500 font-medium">
              {relativeDue(invoice.dueDate)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print / Download PDF */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => window.print()}
            aria-label="Print invoice"
          >
            Print
          </Button>

          {/* BACKEND PDF: replace onClick with window.open(`/api/invoices/${id}/pdf`) */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            aria-label="Download PDF (coming soon)"
            disabled
            title="PDF download available once the backend is wired"
          >
            Download PDF
          </Button>

          {/* Send */}
          {canSend && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Send className="w-3.5 h-3.5" />}
              isLoading={actionLoading === 'send'}
              disabled={!!actionLoading}
              onClick={handleSend}
            >
              Send
            </Button>
          )}

          {/* Confirm (Draft only) */}
          {canConfirm && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              isLoading={actionLoading === 'confirm'}
              disabled={!!actionLoading}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          )}

          {/* Cancel */}
          {canCancel && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
              isLoading={actionLoading === 'cancel'}
              disabled={!!actionLoading}
              onClick={() => setCancelOpen(true)}
              className="!text-rose-600 hover:!bg-rose-50"
            >
              Cancel
            </Button>
          )}

          {/* Record Payment — primary CTA */}
          {canPay && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              disabled={!!actionLoading}
              onClick={() => setPaymentOpen(true)}
              id="record-payment-btn"
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* ── Invoice Document ──────────────────────────────────────── */}
      <div className={`transition-all duration-500 ${justPaid ? 'ring-4 ring-emerald-400/50 rounded-2xl' : ''}`}>
        <InvoiceDocument invoice={invoice} />
      </div>

      {/* ── Payments Section ─────────────────────────────────────── */}
      <div className="mt-8 print:hidden no-print">
        <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Payments</h2>

        {(invoice.payments || []).length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            text="Once a payment is recorded, it will appear here."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.payments.map((pay) => {
                  const meta = methodMeta(pay.method);
                  const Icon = meta.Icon;
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                          <span className="font-medium text-slate-700">{pay.method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyText amount={pay.amount} size="sm" tone="positive" />
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(pay.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {pay.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cancel Confirm Dialog ─────────────────────────────────── */}
      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel this invoice?"
        message={`Invoice ${invNumber} will be cancelled and cannot accept payments. This cannot be undone.`}
        confirmText="Yes, cancel invoice"
        isLoading={actionLoading === 'cancel'}
        variant="danger"
      />

      {/* ── Record Payment Drawer ─────────────────────────────────── */}
      <RecordPaymentDrawer
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        invoice={invoice}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}

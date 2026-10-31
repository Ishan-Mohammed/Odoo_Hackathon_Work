/**
 * RecordPaymentDrawer
 * ─────────────────────────────────────────────
 * Opens from the sticky action bar on /invoices/:id
 * and from the "Record payment" button on /payments.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   invoice       full invoice object (or null when called from /payments)
 *   onSuccess     (payment, invoice) => void
 *
 * Validation:
 *   amount > 0 AND amount <= outstanding
 *   method must be selected
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import PaymentMethodPicker from './PaymentMethodPicker';
import { recordPayment } from '../../api/client';
import { formatMoney } from '../../utils/format';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function RecordPaymentDrawer({ isOpen, onClose, invoice, onSuccess }) {
  const outstanding = invoice ? +(invoice.outstanding || 0) : 0;

  const [method,  setMethod]  = useState('UPI');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(todayISO());
  const [note,    setNote]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState(null);

  // Pre-fill amount with outstanding whenever invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      setAmount(String(outstanding > 0 ? outstanding : ''));
      setDate(todayISO());
      setNote('');
      setApiError(null);
      setMethod('UPI');
    }
  }, [isOpen, invoice, outstanding]);

  const numAmount = parseFloat(amount) || 0;
  const remaining = +(outstanding - numAmount).toFixed(2);
  const willPay   = numAmount > 0 && remaining <= 0.001;

  const amountError =
    numAmount <= 0            ? 'Amount must be greater than 0' :
    numAmount > outstanding + 0.001 ? 'Exceeds outstanding amount'      :
    null;

  const isValid = !amountError && method && date;

  const handleSubmit = async () => {
    if (!isValid || submitting || !invoice) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const { payment, invoice: updatedInvoice } = await recordPayment({
        invoiceId: invoice.id,
        method,
        amount:    numAmount,
        date:      new Date(date).toISOString(),
        note,
      });
      toast.success('Payment recorded');
      onSuccess?.(payment, updatedInvoice);
      onClose();
    } catch (err) {
      setApiError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" disabled={submitting} onClick={onClose}>Cancel</Button>
      <Button
        variant="primary"
        isLoading={submitting}
        disabled={!isValid || submitting}
        onClick={handleSubmit}
      >
        Record payment
      </Button>
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Record Payment"
      subtitle={invoice ? `${invoice.number || invoice.invoiceNumber} · ${invoice.customerName}` : ''}
      footer={footer}
      width="md"
    >
      {!invoice ? (
        <div className="text-sm text-slate-500 text-center py-8">No invoice selected.</div>
      ) : (
        <div className="space-y-5">
          {/* Invoice read-only */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Invoice</span>
              <span className="font-mono font-semibold text-slate-700">
                {invoice.number || invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Customer</span>
              <span className="text-slate-700">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-600">Outstanding</span>
              <MoneyText amount={outstanding} size="sm" tone={outstanding > 0 ? 'negative' : 'positive'} />
            </div>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-3 text-xs text-rose-700">
              {apiError}
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pay-amount" className="text-sm font-medium text-slate-700">Amount (INR)</label>
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline focus-visible:outline-none"
                onClick={() => setAmount(String(outstanding))}
              >
                Pay full amount
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
              <input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-4 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                  amountError && numAmount !== 0 ? 'border-rose-300 focus:ring-rose-300/30' : 'border-slate-200 focus:border-brand-400'
                }`}
              />
            </div>
            {amountError && numAmount !== 0 && (
              <p className="mt-1 text-xs text-rose-600">{amountError}</p>
            )}
          </div>

          {/* Live preview */}
          <div className={`rounded-xl px-3.5 py-2.5 text-xs transition-all ${
            willPay
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-slate-50 border border-slate-100'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Remaining after this payment</span>
              <span className={`font-semibold tabular-nums ${willPay ? 'text-emerald-600' : 'text-slate-800'}`}>
                {numAmount > 0 ? formatMoney(Math.max(0, remaining)) : '—'}
              </span>
            </div>
            {willPay && (
              <div className="flex items-center gap-1.5 mt-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Invoice will be marked Paid
              </div>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Payment method</label>
            <PaymentMethodPicker value={method} onChange={setMethod} />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="pay-date" className="text-sm font-medium text-slate-700 block mb-1.5">Date</label>
            <input
              id="pay-date"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>

          {/* Note */}
          <div>
            <label htmlFor="pay-note" className="text-sm font-medium text-slate-700 block mb-1.5">Note (optional)</label>
            <textarea
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reference, transaction ID, etc."
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

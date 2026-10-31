/**
 * InvoiceDocument — printable invoice card
 *
 * Renders the full invoice like a real paper document.
 * Print CSS is in print.css (imported by InvoiceDetailPage).
 *
 * <!-- BACKEND PDF: when the real API ships, replace window.print() on the
 *      "Download PDF" button with: window.open(`/api/invoices/${id}/pdf`) -->
 */

import React from 'react';
import { Link } from 'react-router-dom';
import MoneyText from '../../components/ui/MoneyText';
import { formatDate } from '../../utils/format';
import { FEATURES } from '../../config/features';

function Row({ label, value, className = '' }) {
  return (
    <div className={`flex justify-between items-baseline text-sm gap-4 ${className}`}>
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  );
}

function MetaItem({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

// Status ribbon colors
const ribbonColors = {
  Draft:     'bg-slate-500',
  Confirmed: 'bg-amber-500',
  Paid:      'bg-emerald-500',
  Overdue:   'bg-rose-500',
  Cancelled: 'bg-red-600',
};

export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const {
    number, invoiceNumber, subscriptionNumber, subscriptionId,
    customer, periodStart, periodEnd, dueDate,
    lines = [], payments = [],
    subtotal, discountTotal, taxTotal, total, paidAmount, outstanding,
    discountLabel, taxLabel, status,
  } = invoice;

  const invNumber   = number || invoiceNumber;
  const ribbonColor = ribbonColors[status] || 'bg-slate-500';

  return (
    <div
      id="invoice-document"
      className="bg-white rounded-2xl border border-slate-200 shadow-soft-sm overflow-hidden print:shadow-none print:border-none print:rounded-none"
    >
      {/* Header band */}
      <div className="relative bg-gradient-to-r from-brand-700 to-violet-700 px-8 py-6 print:bg-brand-700">
        {/* Status ribbon */}
        <div
          className={`absolute top-4 right-4 ${ribbonColor} text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full`}
          aria-label={`Status: ${status}`}
        >
          {status}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="text-brand-200 text-xs font-semibold tracking-widest uppercase mb-1">
              Brightloop Software Pvt. Ltd.
            </p>
            <p className="text-white/70 text-xs">
              1st Floor, TechPark, Whitefield,<br />
              Bangalore 560 066 · GST: 29AAACB0000A1Z5
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Invoice</p>
            <p className="font-mono text-white text-2xl font-extrabold tracking-tight">{invNumber}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Bill-to + Meta grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Bill To */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-slate-900 text-sm">{customer?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{customer?.email}</p>
            {customer?.address && (
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{customer.address}</p>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <MetaItem label="Period">
              <span>{formatDate(periodStart)} – {formatDate(periodEnd)}</span>
            </MetaItem>
            <MetaItem label="Due Date">
              <span className={status === 'Overdue' ? 'text-rose-600 font-semibold' : ''}>
                {formatDate(dueDate)}
              </span>
            </MetaItem>
            <MetaItem label="Subscription">
              {FEATURES.subscriptionsAdmin ? (
                <Link
                  to={`/subscriptions/${subscriptionId}`}
                  className="text-brand-600 hover:underline font-mono text-sm"
                >
                  {subscriptionNumber}
                </Link>
              ) : (
                <span className="font-mono text-sm text-slate-800">
                  {subscriptionNumber}
                </span>
              )}
            </MetaItem>
            <MetaItem label="Status">
              <span className={`font-semibold ${
                status === 'Paid'      ? 'text-emerald-600' :
                status === 'Overdue'  ? 'text-rose-600'    :
                status === 'Cancelled'? 'text-red-600'     :
                'text-slate-700'
              }`}>
                {status}
              </span>
            </MetaItem>
          </div>
        </div>

        {/* Lines table */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Unit Price</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-slate-800">{line.description}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">{line.qty}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <MoneyText amount={line.unitPrice} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">
                    <MoneyText amount={line.amount} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals block */}
        <div className="ml-auto max-w-xs space-y-2 pt-2 border-t border-slate-100">
          <Row label="Subtotal" value={<MoneyText amount={subtotal} size="sm" />} />

          {discountTotal > 0 && (
            <Row
              label={discountLabel ? `Discount (${discountLabel})` : 'Discount'}
              value={
                <span className="text-emerald-600 font-semibold tabular-nums">
                  − {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(discountTotal)}
                </span>
              }
            />
          )}

          {discountTotal > 0 && (
            <Row label="Taxable amount" value={<MoneyText amount={subtotal - discountTotal} size="sm" />} />
          )}

          <Row
            label={taxLabel || 'Tax'}
            value={<MoneyText amount={taxTotal} size="sm" />}
          />

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-base font-bold text-slate-900">Total</span>
            <MoneyText amount={total} size="lg" />
          </div>

          {paidAmount > 0 && (
            <Row
              label="Paid"
              value={
                <span className="text-emerald-600 font-semibold tabular-nums">
                  − {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(paidAmount)}
                </span>
              }
            />
          )}

          <div className={`flex justify-between items-baseline pt-2 border-t-2 ${
            outstanding <= 0 ? 'border-emerald-300' : 'border-slate-300'
          }`}>
            <span className={`text-sm font-bold ${outstanding <= 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
              Amount due
            </span>
            <MoneyText
              amount={outstanding}
              size="md"
              tone={outstanding <= 0 ? 'positive' : 'negative'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-dashed border-slate-100 text-xs text-slate-400 text-center space-y-0.5">
          <p>Thank you for your business. Please make payment by the due date.</p>
          <p>For queries, email <a href="mailto:billing@brightloop.in" className="text-brand-500 hover:underline">billing@brightloop.in</a></p>
          {/* BACKEND PDF: replace window.print() below with window.open(`/api/invoices/${invoice.id}/pdf`) */}
        </div>
      </div>
    </div>
  );
}

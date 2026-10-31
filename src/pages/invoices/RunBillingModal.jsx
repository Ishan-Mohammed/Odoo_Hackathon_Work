/**
 * RunBillingModal — 3-stage hero modal: Preview → Confirm → Result
 *
 * Stage machine:
 *   'preview'  → calls runBilling({dryRun:true}), shows summary numbers
 *   'confirm'  → summary sentence + Run button
 *   'result'   → animated success/error tiles + links to created invoices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, CheckCircle2, AlertTriangle, SkipForward, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import Skeleton from '../../components/ui/Skeleton';
import { runBilling } from '../../api/client';
import { formatMoney } from '../../utils/format';

// Small stepper inside the modal
function ModalStepper({ stage }) {
  const stages = [
    { key: 'preview', label: 'Preview' },
    { key: 'confirm', label: 'Confirm' },
    { key: 'result',  label: 'Result'  },
  ];
  const active = stages.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center gap-0 mb-6">
      {stages.map((s, idx) => {
        const isDone    = idx < active;
        const isCurrent = idx === active;
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-brand-600 text-white ring-2 ring-brand-200'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </span>
              <span
                className={`text-xs font-medium select-none ${
                  isCurrent ? 'text-slate-900' : isDone ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${idx < active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Big stat tile inside the modal
function BigStat({ label, value, isMoney = false, tone = 'default' }) {
  const toneMap = {
    default: 'text-slate-900',
    positive: 'text-emerald-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="flex flex-col items-center gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <span className={`font-display text-2xl font-extrabold tabular-nums ${toneMap[tone]}`}>
        {isMoney ? formatMoney(value) : value.toLocaleString('en-IN')}
      </span>
      <span className="text-xs text-slate-500 text-center leading-snug">{label}</span>
    </div>
  );
}

export default function RunBillingModal({ isOpen, onClose, onDone }) {
  const [stage,    setStage]    = useState('preview');
  const [preview,  setPreview]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const isRunning = stage === 'confirm' && loading;

  // Fetch preview on open (or when "Run again" resets to preview)
  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const data = await runBilling({ dryRun: true });
      setPreview(data);
    } catch (err) {
      setError(err?.message || 'Failed to load billing preview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && stage === 'preview') {
      fetchPreview();
    }
  }, [isOpen, stage, fetchPreview]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStage('preview');
      setPreview(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  // Prevent overlay close + Esc during run
  const handleClose = () => {
    if (isRunning) return;
    onClose();
  };

  const handleRunBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runBilling({ dryRun: false });
      setResult(data);
      setStage('result');
    } catch (err) {
      setError(err?.message || 'Billing run failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoices = () => {
    onClose();
    onDone?.();
  };

  const handleRunAgain = () => {
    setStage('preview');
    setResult(null);
    setError(null);
  };

  // ── STAGE: Preview ────────────────────────────────────────────────
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center gap-2">
                <Skeleton variant="line" width="80px" height="28px" />
                <Skeleton variant="line" width="90px" height="12px" />
              </div>
            ))}
          </div>
          <Skeleton variant="line" width="100%" height="12px" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          <p className="font-semibold mb-1">Preview failed</p>
          <p className="text-xs">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={fetchPreview}>
            Retry
          </Button>
        </div>
      );
    }

    if (!preview) return null;

    const isEmpty = preview.dueCount === 0 || (preview.dueCount - (preview.alreadyBilledCount || 0)) === 0;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Subscriptions due" value={preview.dueCount} />
          <BigStat label="Estimated total" value={preview.estimatedTotal} isMoney tone="positive" />
          <BigStat label="Already billed (skip)" value={preview.alreadyBilledCount || 0} tone="amber" />
        </div>

        {isEmpty ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
            <Zap className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="font-semibold text-amber-800 text-sm">Nothing to bill right now</p>
            <p className="text-xs text-amber-600 mt-1">All due subscriptions have already been billed.</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center">
            Nothing is created until you confirm. This is a preview only.
          </p>
        )}

        <div className="flex gap-2.5 pt-1">
          <Button variant="secondary" fullWidth onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            fullWidth
            disabled={isEmpty}
            onClick={() => setStage('confirm')}
            leftIcon={<Zap className="w-4 h-4" />}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  };

  // ── STAGE: Confirm ────────────────────────────────────────────────
  const renderConfirm = () => {
    const billable = preview ? preview.dueCount - (preview.alreadyBilledCount || 0) : 0;

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-center">
          <Zap className="w-8 h-8 text-brand-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-900 text-sm">
            Create <strong>{billable}</strong> invoice{billable !== 1 ? 's' : ''} totalling{' '}
            <strong>{formatMoney(preview?.estimatedTotal || 0)}</strong>?
          </p>
          <p className="text-xs text-slate-500 mt-1">This cannot be undone. Invoices will be set to Confirmed.</p>
        </div>

        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={() => setStage('preview')}
          >
            Back
          </Button>
          <Button
            variant="primary"
            fullWidth
            isLoading={loading}
            disabled={loading}
            onClick={handleRunBilling}
            leftIcon={!loading ? <Zap className="w-4 h-4" /> : null}
          >
            Run billing
          </Button>
        </div>
      </div>
    );
  };

  // ── STAGE: Result ─────────────────────────────────────────────────
  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {/* Animated success check */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="font-display font-bold text-lg text-slate-900">Billing complete!</p>
        </div>

        {/* Result tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <p className="text-xl font-extrabold text-emerald-600">{result.created.length}</p>
            <p className="text-[11px] text-emerald-700">Created</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
            <p className="text-xl font-extrabold text-amber-600">{result.skippedDuplicates}</p>
            <p className="text-[11px] text-amber-700">Skipped (dup)</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
            <p className="text-xl font-extrabold text-rose-600">{result.failed.length}</p>
            <p className="text-[11px] text-rose-700">Failed</p>
          </div>
        </div>

        {/* Created list */}
        {result.created.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {result.created.map((c) => (
              <div key={c.invoiceId} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                <div>
                  <Link
                    to={`/invoices/${c.invoiceId}`}
                    onClick={onClose}
                    className="font-mono font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                  >
                    {c.number}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                  <span className="text-slate-500 ml-2">{c.customerName}</span>
                </div>
                <MoneyText amount={c.total} size="sm" />
              </div>
            ))}
          </div>
        )}

        {/* Failed list */}
        {result.failed.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Failed
            </p>
            {result.failed.map((f, i) => (
              <div key={i} className="text-xs bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
                <span className="font-mono font-semibold">{f.subscriptionNumber}</span>
                <span className="text-rose-600 ml-2">{f.reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleRunAgain}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Run again
          </Button>
          <Button variant="primary" fullWidth onClick={handleViewInvoices}>
            View invoices
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Run Billing"
      subtitle={stage === 'preview' ? 'Preview invoices that will be created' : undefined}
      size="md"
    >
      <ModalStepper stage={stage} />
      {stage === 'preview' && renderPreview()}
      {stage === 'confirm' && renderConfirm()}
      {stage === 'result'  && renderResult()}
    </Modal>
  );
}

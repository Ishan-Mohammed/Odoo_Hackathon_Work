import React from 'react';

export default function StatusBadge({
  status = 'Draft',
  daysOverdue = null,
  size = 'md',
  className = '',
}) {
  const normalized = String(status || '').toLowerCase().trim();

  const statusConfigs = {
    draft: {
      label: 'Draft',
      classes: 'bg-slate-100 text-slate-700 border-slate-200/90',
      dot: 'bg-slate-400',
    },
    quotation: {
      label: 'Quotation',
      classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    },
    confirmed: {
      label: 'Confirmed',
      classes: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    active: {
      label: 'Active',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    paused: {
      label: 'Paused',
      classes: 'bg-orange-50 text-orange-800 border-orange-200/80',
      dot: 'bg-orange-500',
    },
    closed: {
      label: 'Closed',
      classes: 'bg-slate-100 text-slate-600 border-slate-200/80',
      dot: 'bg-slate-400',
    },
    paid: {
      label: 'Paid',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    overdue: {
      label: daysOverdue ? `${daysOverdue} days overdue` : 'Overdue',
      classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500 animate-pulse',
    },
    cancelled: {
      label: 'Cancelled',
      classes: 'bg-red-50/70 text-red-600/80 border-red-200/60',
      dot: 'bg-red-400',
    },
  };

  const config = statusConfigs[normalized] || {
    label: status,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-[13px] px-3 py-1 gap-2',
  }[size] || 'text-xs px-2.5 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border select-none ${sizeClasses} ${config.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

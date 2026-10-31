import React from 'react';
import { formatMoney } from '../../utils/format';

export default function MoneyText({
  amount = 0,
  right = false,
  size = 'md',
  tone = 'default',
  showSymbol = true,
  className = '',
}) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold tracking-tight',
    '2xl': 'text-3xl font-extrabold tracking-tight',
  }[size] || 'text-base font-semibold';

  const toneClasses = {
    default: 'text-slate-900',
    positive: 'text-emerald-600',
    negative: 'text-rose-600',
    muted: 'text-slate-500',
  }[tone] || 'text-slate-900';

  const formatted = formatMoney(amount, showSymbol);

  return (
    <span
      className={`font-sans tabular-nums ${toneClasses} ${sizeClasses} ${
        right ? 'text-right block w-full' : 'inline-block'
      } ${className}`}
    >
      {formatted}
    </span>
  );
}

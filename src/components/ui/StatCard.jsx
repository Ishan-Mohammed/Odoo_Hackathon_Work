import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Skeleton from './Skeleton';
import MoneyText from './MoneyText';
import { formatMoney } from '../../utils/format';

export default function StatCard({
  icon: Icon = null,
  iconClassName = 'bg-brand-50 text-brand-600 border-brand-100',
  label,
  value = 0,
  isCurrency = false,
  trend = null,
  subline = null,
  onClick = null,
  isLoading = false,
  className = '',
}) {
  const [animatedVal, setAnimatedVal] = useState(0);

  useEffect(() => {
    if (isLoading) return;

    const target = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedVal(target);
      return;
    }

    let start = null;
    let frameId;
    const duration = 800;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedVal(target * easeOutCubic(progress));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, isLoading]);

  if (isLoading) {
    return (
      <div className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-xs space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton variant="line" width="90px" height="14px" />
          <Skeleton variant="circle" width="36px" height="36px" />
        </div>
        <Skeleton variant="line" width="140px" height="28px" />
        <Skeleton variant="line" width="110px" height="12px" />
      </div>
    );
  }

  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-xs text-left transition-all duration-150 ${
        onClick
          ? 'hover:border-brand-300 hover:shadow-soft-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:ring-offset-2'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${iconClassName}`}>
            {React.isValidElement(Icon) ? Icon : <Icon className="w-4 h-4" />}
          </div>
        )}
      </div>

      <div className="mb-1">
        {isCurrency ? (
          <span className="font-display text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight">
            <MoneyText amount={animatedVal} size="2xl" />
          </span>
        ) : (
          <span className="font-display text-2xl xl:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
            {Math.round(animatedVal).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {subline && <div className="mt-1 text-xs">{subline}</div>}

      {trend && (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </CardWrapper>
  );
}

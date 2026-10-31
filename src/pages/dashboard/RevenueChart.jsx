import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import MoneyText from '../../components/ui/MoneyText';

// Indian Number format: 1L = 1,00,000, 1Cr = 1,00,00,000
function formatIndianAxis(value) {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(0)}L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return String(value);
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0];
    return (
      <div className="p-3 bg-slate-900 text-white rounded-xl shadow-soft-lg border border-slate-800 text-xs">
        <p className="font-semibold text-slate-300 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span className="text-slate-400">Revenue:</span>
          <MoneyText amount={dataPoint.value} size="sm" tone="positive" className="text-emerald-400 font-bold" />
        </div>
      </div>
    );
  }
  return null;
}

export default function RevenueChart({ data = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="line" width="160px" height="20px" />
          <Skeleton variant="line" width="80px" height="14px" />
        </div>
        <Skeleton variant="block" height="240px" />
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.revenue > 0);

  return (
    <div
      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-soft-xs flex flex-col justify-between"
      aria-label="Revenue by month chart"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Revenue by Month
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            12-month billing trend & collected receipts
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center">
          <EmptyState title="No revenue in this period" text="There are no collected receipts matching the current date filters." />
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />

              <YAxis
                tickFormatter={formatIndianAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />

              <Bar
                dataKey="revenue"
                fill="url(#revenueGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
                isAnimationActive={typeof window !== 'undefined' ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : false}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

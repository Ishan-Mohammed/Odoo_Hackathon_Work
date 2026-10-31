import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_COLOR_MAP = {
  Paid: '#10b981',
  Confirmed: '#f59e0b',
  Draft: '#94a3b8',
  Overdue: '#f43f5e',
  Cancelled: '#f87171',
};

export default function StatusDonut({ data = [], isLoading = false }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
        <Skeleton variant="line" width="140px" height="20px" />
        <div className="flex items-center justify-center h-64">
          <Skeleton variant="circle" width="160px" height="160px" />
        </div>
      </div>
    );
  }

  const validData = (data || []).filter((item) => item.count > 0);
  const totalCount = validData.reduce((sum, item) => sum + item.count, 0);

  const handleSliceClick = (status) => {
    navigate(`/invoices?status=${status}`);
  };

  return (
    <div
      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-soft-xs flex flex-col justify-between"
      aria-label="Invoice status distribution chart"
    >
      <div>
        <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
          Invoice Status
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Breakdown of invoice lifecycle states
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <EmptyState title="No invoices found" text="No invoices match the chosen filters." />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
          {/* Donut Chart with Center Total */}
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const pct = ((item.count / totalCount) * 100).toFixed(1);
                      return (
                        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-soft-lg text-xs border border-slate-800">
                          <p className="font-semibold">{item.status}</p>
                          <p className="text-slate-300">
                            {item.count} invoices ({pct}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={validData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={84}
                  paddingAngle={3}
                  isAnimationActive={typeof window !== 'undefined' ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : false}
                  animationDuration={800}
                  onClick={(entry) => handleSliceClick(entry.status)}
                  className="cursor-pointer focus:outline-none"
                >
                  {validData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLOR_MAP[entry.status] || '#cbd5e1'}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                {totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Interactive Legend List on Right */}
          <div className="w-full sm:w-auto flex-1 space-y-2">
            {validData.map((item) => {
              const color = STATUS_COLOR_MAP[item.status] || '#94a3b8';
              const percent = ((item.count / totalCount) * 100).toFixed(0);

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => handleSliceClick(item.status)}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 transition-colors group select-none text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-slate-700 group-hover:text-slate-900">
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-semibold text-slate-900">{item.count}</span>
                    <span className="text-slate-400 text-[11px]">({percent}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

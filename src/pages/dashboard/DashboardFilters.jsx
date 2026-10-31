import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FiltersBar from '../../components/ui/FiltersBar';
import { listCustomers } from '../../api/client';
import { DATE_PRESETS, computePresetRange } from './datePresets';

export default function DashboardFilters({ onFiltersChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);

  // Read initial filter values from URL params
  const currentPreset = searchParams.get('preset') || 'this_month';
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';
  const currentCustomerId = searchParams.get('customerId') || '';
  const currentStatus = searchParams.get('status') || '';

  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);

  // Load customer options
  useEffect(() => {
    listCustomers({ pageSize: 100 })
      .then((res) => {
        setCustomers(res?.data || []);
      })
      .catch(() => {
        setCustomers([]);
      });
  }, []);

  // Sync to parent on filter change with 300ms debounce
  useEffect(() => {
    let effectiveFrom = currentFrom;
    let effectiveTo = currentTo;

    if (currentPreset !== 'custom') {
      const computed = computePresetRange(currentPreset);
      effectiveFrom = computed.from;
      effectiveTo = computed.to;
    }

    const timer = setTimeout(() => {
      onFiltersChange?.({
        preset: currentPreset,
        from: effectiveFrom,
        to: effectiveTo,
        customerId: currentCustomerId,
        status: currentStatus,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPreset, currentFrom, currentTo, currentCustomerId, currentStatus, onFiltersChange]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handlePresetSelect = (presetId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('preset', presetId);
      if (presetId !== 'custom') {
        const computed = computePresetRange(presetId);
        next.set('from', computed.from);
        next.set('to', computed.to);
      }
      return next;
    });
  };

  const handleReset = () => {
    setSearchParams({});
    setCustomFrom('');
    setCustomTo('');
  };

  return (
    <FiltersBar onReset={handleReset}>
      {/* 1. Date Preset Segmented Control */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/90 text-xs font-medium select-none">
        {DATE_PRESETS.map((p) => {
          const isSelected = currentPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 ${
                isSelected
                  ? 'bg-white text-slate-900 font-semibold shadow-soft-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 2. Custom Date Inputs (only when Custom preset chosen) */}
      {currentPreset === 'custom' && (
        <div className="flex items-center gap-1.5 animate-fade-in">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              updateParam('from', e.target.value);
            }}
            aria-label="Filter from date"
            className="h-9 px-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              updateParam('to', e.target.value);
            }}
            aria-label="Filter to date"
            className="h-9 px-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
      )}

      {/* 3. Customer Select Dropdown */}
      <select
        value={currentCustomerId}
        onChange={(e) => updateParam('customerId', e.target.value)}
        aria-label="Filter by customer"
        className="h-9 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/25 min-w-[150px]"
      >
        <option value="">All Customers</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* 4. Status Filter Dropdown */}
      <select
        value={currentStatus}
        onChange={(e) => updateParam('status', e.target.value)}
        aria-label="Filter by status"
        className="h-9 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      >
        <option value="">All Statuses</option>
        <option value="Paid">Paid</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Overdue">Overdue</option>
        <option value="Draft">Draft</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    </FiltersBar>
  );
}

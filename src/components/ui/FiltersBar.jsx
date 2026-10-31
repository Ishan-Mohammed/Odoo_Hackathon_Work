import React from 'react';
import { RotateCcw } from 'lucide-react';
import Button from './Button';

export default function FiltersBar({
  children,
  onReset = null,
  showReset = true,
  className = '',
}) {
  return (
    <div
      className={`mb-4 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {/* Filter Slots */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[200px]">
        {children}
      </div>

      {/* Reset Action */}
      {showReset && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-slate-500 hover:text-slate-800"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}

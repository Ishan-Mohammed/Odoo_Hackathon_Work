import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Button from './Button';

export default function DataTable({
  columns = [],
  data = [],
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onRowClick,
  isLoading = false,
  error = null,
  onRetry = null,
  emptyTitle = 'No data available',
  emptyMessage = 'No records match the current view.',
  className = '',
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!sortConfig.key) return list;
    return [...list].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} className={className} />;
  }

  return (
    <div className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-soft-xs flex flex-col overflow-hidden ${className}`}>
      {/* Table container with horizontal scroll */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header */}
          <thead className="bg-slate-50/90 border-b border-slate-200/80 sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig.key === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider select-none ${alignClass} ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.header || col.label}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {isLoading ? (
              // Skeleton Loading Rows
              Array.from({ length: pageSize || 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={`cell-${idx}-${cIdx}`} className="px-4 py-3.5">
                      <Skeleton variant="line" height="14px" width={cIdx === 0 ? '70%' : '50%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} text={emptyMessage} />
                </td>
              </tr>
            ) : (
              sortedData.map((row, rIdx) => (
                <tr
                  key={row.id || row._id || rIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const rawVal = row[col.key];
                    const content = col.render ? col.render(rawVal, row) : rawVal ?? '—';

                    return (
                      <td key={col.key} className={`px-4 py-3.5 ${alignClass}`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <strong className="font-semibold text-slate-700">{startItem}</strong> to{' '}
            <strong className="font-semibold text-slate-700">{endItem}</strong> of{' '}
            <strong className="font-semibold text-slate-700">{total}</strong> results
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>

            <span className="px-2 font-medium text-slate-600">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

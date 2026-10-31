import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  message = 'Failed to load content. Please check your network connection and try again.',
  onRetry = null,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 bg-rose-50/40 ${className}`}
    >
      <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="font-display font-bold text-sm text-slate-900 mb-1">
        Something went wrong
      </h3>
      <p className="text-xs text-slate-600 max-w-sm mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

import React, { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    helperText,
    errorMessage,
    success = false,
    leftIcon = null,
    rightSlot = null,
    type = 'text',
    id,
    disabled = false,
    required = false,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(errorMessage);

  // Border & Ring state styles
  let stateClasses = 'border-slate-200/90 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/25';
  if (hasError) {
    stateClasses = 'border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-500/25 bg-rose-50/20';
  } else if (success) {
    stateClasses = 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/25';
  }

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        </div>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 transition-colors">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={`w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border shadow-soft-sm transition-all duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50/80 disabled:cursor-not-allowed disabled:text-slate-500 ${
            leftIcon ? 'pl-10' : ''
          } ${rightSlot ? 'pr-11' : ''} ${stateClasses} ${className}`}
          {...props}
        />

        {rightSlot && (
          <div className="absolute right-2.5 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>

      {/* Inline Feedback message with aria-live */}
      {hasError ? (
        <p id={errorId} aria-live="polite" className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium animate-fade-in">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 108 1a7 7 0 000 14zm-.75-9.25a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6.75a.875.875 0 100-1.75.875.875 0 000 1.75z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;

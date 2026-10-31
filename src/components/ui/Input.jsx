import React, { forwardRef, useId, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const Input = forwardRef(function Input(
  {
    label,
    labelRightSlot = null,
    helperText,
    errorMessage,
    success = false,
    leftIcon = null,
    rightSlot = null,
    type = 'text',
    id,
    disabled = false,
    required = false,
    optional = false,
    className = '',
    containerClassName = '',
    placeholder = 'you@company.com',
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const [isFocused, setIsFocused] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const hasError = Boolean(errorMessage);

  // Trigger shake animation once when errorMessage becomes truthy
  useEffect(() => {
    if (errorMessage) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  let stateClasses =
    'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 bg-white';
  if (hasError) {
    stateClasses =
      'border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25 bg-rose-50/20';
  } else if (success) {
    stateClasses =
      'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 bg-white';
  }

  return (
    <div className={`w-full ${shouldShake ? 'animate-shake' : ''} ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={inputId}
            className={`block text-[13px] font-medium select-none transition-colors duration-150 ${
              isFocused ? 'text-brand-700' : 'text-slate-700'
            }`}
          >
            {label}
            {optional && (
              <span className="ml-1.5 text-xs text-slate-400 font-normal">Optional</span>
            )}
          </label>
          {labelRightSlot && (
            <div className="text-[13px]">{labelRightSlot}</div>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div
            className={`absolute left-3.5 flex items-center pointer-events-none transition-colors duration-150 ${
              isFocused ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={`w-full h-11 rounded-xl px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 border shadow-soft-xs transition-all duration-150 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500 ${
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

      {hasError ? (
        <p
          id={errorId}
          aria-live="polite"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
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

import React from 'react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  onClick,
  ...props
}) {
  const baseClasses =
    'group relative inline-flex items-center justify-center font-medium select-none overflow-hidden transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none';

  const sizeClasses = {
    sm: 'text-xs h-9 px-3.5 rounded-lg gap-1.5',
    md: 'text-sm h-11 px-4 rounded-xl gap-2',
    lg: 'text-sm h-11 px-5 rounded-xl gap-2 font-semibold',
  }[size] || 'text-sm h-11 px-4 rounded-xl gap-2';

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white shadow-brand-btn hover:shadow-brand-btn-hover hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-soft-xs hover:border-slate-300 hover:text-slate-900 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-none shadow-none',
  }[variant] || '';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      {...props}
    >
      {/* Moving shine light effect on hover */}
      {variant === 'primary' && !disabled && !isLoading && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:translate-x-[300%] transition-transform duration-700 ease-out"
          aria-hidden="true"
        />
      )}

      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Please wait...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && (
            <span className="inline-flex shrink-0 items-center transition-transform duration-150 group-hover:translate-x-[3px]">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

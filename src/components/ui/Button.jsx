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
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99] select-none';

  const sizeClasses = {
    sm: 'text-xs h-8 px-3 rounded-lg gap-1.5',
    md: 'text-sm h-10 px-4 rounded-xl gap-2',
    lg: 'text-base h-12 px-6 rounded-xl gap-2.5',
  }[size] || 'text-sm h-10 px-4 rounded-xl gap-2';

  const variantClasses = {
    primary:
      'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-soft-sm hover:shadow-soft-md shadow-brand-600/20 disabled:hover:bg-brand-600 disabled:shadow-none',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-soft-sm hover:border-slate-300 disabled:hover:bg-white',
    ghost:
      'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border-none shadow-none disabled:hover:bg-transparent',
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
          {rightIcon && <span className="inline-flex shrink-0 items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

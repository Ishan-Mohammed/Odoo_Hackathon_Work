import React from 'react';

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
  style = {},
}) {
  const variantClasses = {
    line: 'h-4 w-full rounded-md',
    block: 'h-24 w-full rounded-xl',
    circle: 'h-10 w-10 rounded-full',
  }[variant] || 'h-4 w-full rounded-md';

  const customStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      style={customStyle}
      className={`animate-pulse bg-slate-200/80 ${variantClasses} ${className}`}
      aria-hidden="true"
    />
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', theme = 'dark', asLink = true, className = '' }) {
  // theme 'dark' means dark text for light background.
  // theme 'light' means light text for dark brand panel background.
  const isLight = theme === 'light';

  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', badge: 'text-[10px] px-1.5 py-0.5' },
    md: { icon: 'w-8 h-8', text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
    lg: { icon: 'w-10 h-10', text: 'text-2xl', badge: 'text-xs px-2.5 py-1' },
  }[size] || { icon: 'w-8 h-8', text: 'text-xl', badge: 'text-xs px-2 py-0.5' };

  const content = (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* Modern geometric loop icon */}
      <div className={`relative flex items-center justify-center ${sizeClasses.icon} rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-accent-400 p-0.5 shadow-soft-sm shadow-brand-500/20`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white p-1"
        >
          {/* Stylized interconnected loops representing recurring subscriptions */}
          <path
            d="M6 12C6 9.79086 7.79086 8 10 8C12.2091 8 14 10 14 12C14 14 15.7909 16 18 16C20.2091 16 22 14.2091 22 12C22 9.79086 20.2091 8 18 8C15.7909 8 14 10 14 12C14 14 12.2091 16 10 16C7.79086 16 6 14.2091 6 12Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`font-semibold tracking-tight ${isLight ? 'text-white' : 'text-slate-900'} ${sizeClasses.text}`}>
          Brightloop
        </span>
        <span
          className={`font-medium rounded-full ${sizeClasses.badge} ${
            isLight
              ? 'bg-white/15 text-accent-300 border border-white/20'
              : 'bg-brand-50 text-brand-700 border border-brand-100'
          }`}
        >
          SaaS
        </span>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link to="/login" className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}

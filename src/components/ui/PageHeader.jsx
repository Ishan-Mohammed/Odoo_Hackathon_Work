import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle = null,
  breadcrumb = null, // array of { label, href }
  actions = null,
  className = '',
}) {
  return (
    <div className={`mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 ${className}`}>
      <div>
        {/* Optional Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <React.Fragment key={item.label || index}>
                  {item.href && !isLast ? (
                    <Link
                      to={item.href}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-slate-600 font-medium' : ''}>
                      {item.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 text-slate-300" />}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  text = 'There are no items matching your criteria at this moment.',
  action = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200/90 bg-white/60 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100/90 text-slate-500 border border-slate-200 flex items-center justify-center mb-3.5 shadow-soft-xs">
        {React.isValidElement(Icon) ? Icon : <Icon className="w-6 h-6 stroke-[1.75]" />}
      </div>
      <h3 className="font-display font-bold text-base text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-5">{text}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

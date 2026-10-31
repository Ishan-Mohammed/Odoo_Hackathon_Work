import React from 'react';
import { ShieldCheck, Percent, Users, LineChart } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'No double billing',
    desc: 'Every period is billed exactly once.',
  },
  {
    icon: Percent,
    title: 'Taxes and discounts',
    desc: 'GST rules and offers applied automatically.',
  },
  {
    icon: Users,
    title: 'Role-based access',
    desc: 'Admin, staff and customer views.',
  },
  {
    icon: LineChart,
    title: 'Live dashboard',
    desc: 'Revenue, outstanding and overdue.',
  },
];

export default function FeatureGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full select-none" aria-hidden="true">
      {FEATURES.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="group relative p-2.5 xl:p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-teal-400/40 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:bg-teal-500/20 group-hover:text-teal-200 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.35)]">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="font-semibold text-xs text-white leading-snug tracking-tight">
              {item.title}
            </p>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              {item.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

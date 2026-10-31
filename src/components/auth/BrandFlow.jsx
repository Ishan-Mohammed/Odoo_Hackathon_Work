import React from 'react';
import { Layers, Repeat, FileText, Wallet, BarChart3 } from 'lucide-react';

const STEPS = [
  { icon: Layers, label: 'Plan', caption: 'Set up products and plans' },
  { icon: Repeat, label: 'Subscribe', caption: 'Start monthly or yearly' },
  { icon: FileText, label: 'Bill', caption: 'Run billing, no duplicates' },
  { icon: Wallet, label: 'Collect', caption: 'UPI, Card, Cash or Bank' },
  { icon: BarChart3, label: 'Report', caption: 'Revenue and overdue at a glance' },
];

export default function BrandFlow({ introDone = true }) {
  return (
    <div className="relative pl-8 space-y-2 py-0.5 select-none" aria-label="How Brightloop Works">
      {/* Connected thin gradient line between nodes */}
      <div
        className="absolute left-[11px] top-2.5 bottom-2.5 w-px bg-gradient-to-b from-teal-400/40 via-brand-400/40 to-violet-400/30 overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft traveling beam of light loop */}
        <div className="w-full h-8 bg-gradient-to-b from-transparent via-teal-300 to-transparent animate-beam-travel" />
      </div>

      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div
            key={step.label}
            className={`relative flex items-center transition-all duration-300 ${
              introDone ? 'animate-flow-node-in' : 'opacity-0'
            }`}
            style={{ animationDelay: `${idx * 120}ms` }}
          >
            {/* Small glowing node */}
            <div
              className="absolute -left-8 w-6 h-6 rounded-lg bg-slate-950/90 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.25)] shrink-0 transition-transform duration-200 hover:scale-110"
              aria-hidden="true"
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Label & 4-6 word caption */}
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-semibold text-xs text-white tracking-tight">
                {step.label}
              </span>
              <span className="text-[11px] text-slate-300 font-normal">
                · {step.caption}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

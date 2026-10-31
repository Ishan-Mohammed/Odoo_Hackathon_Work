import React from 'react';
import { ShieldCheck, Briefcase, UserCheck, Sparkles } from 'lucide-react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../config/demoCredentials';

export default function DemoCredentialChips({ onSelect, disabled = false }) {
  const iconMap = {
    ShieldCheck: ShieldCheck,
    Briefcase: Briefcase,
    UserCheck: UserCheck,
  };

  const handleChipClick = (acc) => {
    if (disabled) return;
    onSelect?.({
      email: acc.email,
      password: DEMO_PASSWORD,
      role: acc.role,
    });
  };

  return (
    <div className="w-full pt-4 mt-6 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Try a demo account</span>
        </div>
        <span className="text-[11px] text-slate-400">One-click sign in</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const IconComponent = iconMap[account.icon] || UserCheck;

          return (
            <button
              key={account.role}
              type="button"
              disabled={disabled}
              onClick={() => handleChipClick(account)}
              className="group relative flex flex-col items-start p-2.5 text-left rounded-xl border border-slate-200/90 bg-white/70 hover:bg-slate-50/90 hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all duration-150 shadow-soft-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-slate-900 group-hover:text-brand-700 transition-colors">
                  <IconComponent className="w-3.5 h-3.5 text-brand-600" />
                  {account.roleLabel}
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                  ⚡ Auto
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium truncate w-full">
                {account.email}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 truncate w-full">
                {account.roleHint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

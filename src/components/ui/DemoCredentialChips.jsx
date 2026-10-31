import React, { useState } from 'react';
import { ShieldCheck, Briefcase, UserCheck, ChevronRight, Loader2 } from 'lucide-react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../config/demoCredentials';

export default function DemoCredentialChips({ onSelect, disabled = false }) {
  const [selectedRole, setSelectedRole] = useState(null);

  const iconMap = {
    ShieldCheck: ShieldCheck,
    Briefcase: Briefcase,
    UserCheck: UserCheck,
  };

  const roleStyles = {
    admin: {
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    },
    staff: {
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
    },
    customer: {
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    },
  };

  const handleChipClick = (acc) => {
    if (disabled || selectedRole) return;
    setSelectedRole(acc.role);
    onSelect?.({
      email: acc.email,
      password: DEMO_PASSWORD,
      role: acc.role,
    });
  };

  return (
    <div className="w-full space-y-2">
      {DEMO_ACCOUNTS.map((account) => {
        const IconComponent = iconMap[account.icon] || UserCheck;
        const style = roleStyles[account.role] || roleStyles.customer;
        const isThisSelected = selectedRole === account.role;
        const isDimmed = selectedRole && !isThisSelected;

        return (
          <button
            key={account.role}
            type="button"
            disabled={disabled || Boolean(selectedRole)}
            onClick={() => handleChipClick(account)}
            className={`group w-full flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:border-brand-500/50 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 transition-all duration-150 disabled:cursor-not-allowed text-left shadow-soft-xs ${
              isDimmed ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-[13px] text-slate-900 group-hover:text-brand-700 transition-colors">
                  {account.roleLabel}
                </span>
                <span className="text-[12px] text-slate-500 font-normal">
                  {account.email}
                </span>
              </div>
            </div>

            {isThisSelected ? (
              <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0 ml-2" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}

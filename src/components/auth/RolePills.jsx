import React from 'react';
import { Shield, UserCheck, User } from 'lucide-react';

export default function RolePills() {
  return (
    <div
      className="hidden [@media(min-height:760px)]:flex items-center gap-2 pt-1 select-none"
      aria-hidden="true"
    >
      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mr-1">
        Built for
      </span>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/10 text-slate-200">
        <Shield className="w-3 h-3 text-indigo-300" />
        <span>Admin</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/10 text-slate-200">
        <UserCheck className="w-3 h-3 text-teal-300" />
        <span>Staff</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/10 text-slate-200">
        <User className="w-3 h-3 text-violet-300" />
        <span>Customer</span>
      </div>
    </div>
  );
}

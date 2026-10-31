import React from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function DashboardPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top navbar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Logo theme="light" asLink={false} />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200">{user?.name || 'Staff User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.email} • {user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 text-center shadow-soft-xl">
          <div className="w-14 h-14 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-brand-400" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30 mb-3">
            Admin & Ops Workspace
          </span>
          <h1 className="text-2xl font-bold text-white mb-2">
            Dashboard — Coming Next
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            You have successfully authenticated as <strong className="text-slate-200">{user?.role}</strong> ({user?.email}).
            The internal recurring revenue metrics, subscription lists, and automated billing engine will be mounted here in the next milestone.
          </p>
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-left text-xs font-mono text-slate-300 mb-6">
            <p className="text-slate-400 mb-1">// Active Auth Session</p>
            <p>ID: {user?.id}</p>
            <p>Role: {user?.role}</p>
            <p>Email: {user?.email}</p>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={logout}
            className="border-slate-700 hover:bg-slate-700 text-slate-800"
          >
            Sign out to return to Login
          </Button>
        </div>
      </main>
    </div>
  );
}

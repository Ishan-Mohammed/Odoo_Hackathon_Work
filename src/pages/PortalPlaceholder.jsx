import React from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { UserCheck, LogOut, FileText } from 'lucide-react';

export default function PortalPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Logo theme="dark" asLink={false} />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{user?.name || 'Customer'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-soft-lg">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 border border-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-7 h-7 text-teal-600" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-3">
            Customer Self-Serve Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Customer Portal — Coming Next
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Welcome back, <strong className="text-slate-900">{user?.name}</strong>. Here you'll be able to manage your recurring billing, update credit card details, download invoices, and upgrade subscription tiers.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs font-mono text-slate-700 mb-6">
            <p className="text-slate-400 mb-1">// Customer Profile</p>
            <p>ID: {user?.id}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {user?.role}</p>
          </div>
          <Button variant="primary" fullWidth onClick={logout}>
            Sign out to return to Login
          </Button>
        </div>
      </main>
    </div>
  );
}

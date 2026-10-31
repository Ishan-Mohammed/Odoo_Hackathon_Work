import React from 'react';
import Logo from '../ui/Logo';
import { Receipt, TrendingUp, Users, CheckCircle } from 'lucide-react';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerLink = null,
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50">
      {/* ========================================================= */}
      {/* LEFT: BRAND PANEL (Desktop only ~45% width)              */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-950 p-12 text-white border-r border-slate-800">
        {/* Soft glowing ambient orbs (pure CSS) */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent-500/15 blur-3xl" />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <Logo theme="light" />
        </div>

        {/* Brand Center Narrative */}
        <div className="relative z-10 my-auto py-8 space-y-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-accent-300 border border-white/15 backdrop-blur-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              SaaS Billing Engine
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Run your recurring revenue on <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-indigo-200 to-accent-300">autopilot</span>.
            </h1>
          </div>

          {/* 3 Core Benefit Points */}
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-slate-300 text-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="pt-0.5 leading-snug">
                Automated invoicing with <strong className="text-white font-medium">no double billing</strong>
              </span>
            </li>
            <li className="flex items-start gap-3 text-slate-300 text-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="pt-0.5 leading-snug">
                Real-time revenue and <strong className="text-white font-medium">overdue tracking</strong>
              </span>
            </li>
            <li className="flex items-start gap-3 text-slate-300 text-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Users className="w-4 h-4" />
              </div>
              <span className="pt-0.5 leading-snug">
                Role-based access for your <strong className="text-white font-medium">whole team</strong>
              </span>
            </li>
          </ul>

          {/* Floating Mini Invoice Preview Card (CSS pure) */}
          <div className="relative pt-2">
            <div className="rounded-2xl p-4 bg-slate-900/75 border border-white/10 backdrop-blur-md shadow-2xl shadow-indigo-950/60 max-w-sm transition-transform hover:-translate-y-1 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-200">INV-0042</span>
                  <span className="text-slate-400">• Acme Traders Ltd</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Paid
                </span>
              </div>
              <div className="pt-3 flex items-baseline justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Amount Collected</p>
                  <p className="text-xl font-bold font-mono text-white mt-0.5">$13,593.60</p>
                </div>
                <span className="text-[11px] text-accent-300 font-medium bg-accent-950/50 px-2 py-1 rounded-md border border-accent-500/20">
                  Auto-reconciled
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>Brightloop Software Inc.</span>
          <span className="flex items-center gap-1 text-slate-500">
            Enterprise Grade • 256-bit TLS
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT: FORM PANEL (Mobile & Desktop)                      */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[440px] py-4">
          {/* Logo on top ONLY on mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo theme="dark" size="lg" />
          </div>

          {/* Form Card Header */}
          <div className="mb-7 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Main Form Content */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-soft-lg shadow-slate-200/50">
            {children}
          </div>

          {/* Optional Footer Link row */}
          {footerLink && (
            <div className="mt-6 text-center text-xs text-slate-500">
              {footerLink}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

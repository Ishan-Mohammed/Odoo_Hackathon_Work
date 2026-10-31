import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';
import { Receipt, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useMouseGlow } from '../../hooks/useMouseGlow';
import { useCountUp } from '../../hooks/useCountUp';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerLink = null,
  isLeaving = false,
}) {
  const location = useLocation();
  const { containerRef, spotlightStyle, cardTiltStyle, parallaxStyle } = useMouseGlow();
  const countUpAmount = useCountUp(13593.6, 900);

  const [isInitialMount, setIsInitialMount] = useState(false);
  const [slideDirection, setSlideDirection] = useState('forward');

  useEffect(() => {
    // Check if user has already seen the initial brand entrance in this session
    const hasSeen = sessionStorage.getItem('brightloop_auth_seen');
    if (!hasSeen) {
      setIsInitialMount(true);
      sessionStorage.setItem('brightloop_auth_seen', 'true');
    }

    const prevPath = sessionStorage.getItem('brightloop_last_path') || '/login';
    const getRouteRank = (path) => {
      if (path.includes('signup')) return 1;
      if (path.includes('forgot')) return 1;
      if (path.includes('reset')) return 2;
      return 0; // /login
    };

    const prevRank = getRouteRank(prevPath);
    const currRank = getRouteRank(location.pathname);

    setSlideDirection(currRank < prevRank ? 'backward' : 'forward');
    sessionStorage.setItem('brightloop_last_path', location.pathname);
  }, [location.pathname]);

  const formAnimationClass = isLeaving
    ? 'animate-slide-out-right'
    : isInitialMount || slideDirection === 'forward'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left-fast';

  return (
    <div className="h-dvh w-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden select-none">
      {/* ========================================================= */}
      {/* LEFT: BRAND PANEL (~48% desktop, hidden on mobile)         */}
      {/* Decluttered: Logo, Headline, 3 Benefits, Preview Card     */}
      {/* ========================================================= */}
      <div
        ref={containerRef}
        className={`hidden lg:flex lg:w-[48%] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-950 p-10 xl:p-14 text-white border-r border-slate-800/80 transition-opacity duration-300 ${
          isLeaving ? 'opacity-40' : 'opacity-100'
        } ${isInitialMount ? 'animate-slide-in-left' : ''}`}
      >
        {/* Soft Drift Glow Blobs (Parallax shifted) */}
        <div
          style={parallaxStyle}
          className="pointer-events-none absolute inset-0 transition-transform duration-100 ease-out"
        >
          <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-violet-600/20 blur-[80px] animate-drift-1" />
          <div className="absolute top-1/2 -right-28 w-96 h-96 rounded-full bg-accent-500/15 blur-[90px] animate-drift-2" />
        </div>

        {/* Mouse Spotlight (eased lerp) */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={spotlightStyle}
        />

        {/* Faint dotted pattern with vignette mask */}
        <div className="pointer-events-none absolute inset-0 pattern-mesh opacity-60" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Logo theme="light" />
        </div>

        {/* Middle Stack: Headline + 3 Benefits + Preview Card */}
        <div className="relative z-10 my-auto py-4 space-y-7 max-w-md">
          {/* Headline */}
          <h1 className="font-display text-4xl xl:text-[44px] font-extrabold tracking-hero text-white leading-[1.08]">
            Run your recurring revenue on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-teal-200 to-violet-300">
              autopilot
            </span>
            .
          </h1>

          {/* 3 Benefit Rows (Icon + Short Title Only) */}
          <div className="space-y-2.5">
            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1 cursor-default">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10 backdrop-blur-md border border-white/10 text-brand-300 shadow-sm transition-all duration-200 group-hover:border-accent-400/50 group-hover:text-accent-300 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.3)]">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                Automated invoicing
              </span>
            </div>

            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1 cursor-default">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10 backdrop-blur-md border border-white/10 text-brand-300 shadow-sm transition-all duration-200 group-hover:border-accent-400/50 group-hover:text-accent-300 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.3)]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                Live revenue tracking
              </span>
            </div>

            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1 cursor-default">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10 backdrop-blur-md border border-white/10 text-brand-300 shadow-sm transition-all duration-200 group-hover:border-accent-400/50 group-hover:text-accent-300 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.3)]">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                Role-based access
              </span>
            </div>
          </div>

          {/* Floating 3D Preview Card */}
          <div className="pt-1">
            <div
              style={cardTiltStyle}
              className="glass-preview rounded-2xl p-5 shadow-glass-card animate-float-card transition-transform duration-200 ease-out"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-200">INV-0042</span>
                  <span className="text-slate-400">· Acme Traders</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Paid
                </span>
              </div>

              <div className="pt-3.5 flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                    Total Collected
                  </p>
                  <p className="text-2xl font-bold font-sans tabular-nums text-white mt-0.5 tracking-tight">
                    {countUpAmount}
                  </p>
                </div>

                {/* 6-bar mini sparkline growing bar-by-bar */}
                <div className="flex items-end gap-1.5 h-7 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <div
                    className="w-1.5 h-[35%] bg-accent-400/60 rounded-full animate-grow-bar origin-bottom"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-1.5 h-[55%] bg-accent-400/70 rounded-full animate-grow-bar origin-bottom"
                    style={{ animationDelay: '80ms' }}
                  />
                  <div
                    className="w-1.5 h-[45%] bg-accent-400/60 rounded-full animate-grow-bar origin-bottom"
                    style={{ animationDelay: '160ms' }}
                  />
                  <div
                    className="w-1.5 h-[75%] bg-accent-400/80 rounded-full animate-grow-bar origin-bottom"
                    style={{ animationDelay: '240ms' }}
                  />
                  <div
                    className="w-1.5 h-[65%] bg-accent-400/80 rounded-full animate-grow-bar origin-bottom"
                    style={{ animationDelay: '320ms' }}
                  />
                  <div
                    className="w-1.5 h-[100%] bg-accent-400 rounded-full shadow-sm shadow-accent-400/50 animate-grow-bar origin-bottom"
                    style={{ animationDelay: '400ms' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal empty footer to balance space without clutter */}
        <div className="relative z-10 h-2" />
      </div>

      {/* ========================================================= */}
      {/* RIGHT: FORM PANEL                                         */}
      {/* Max-w 420px, fits single viewport from 700px height up    */}
      {/* ========================================================= */}
      <div className="flex-1 h-full flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className={`w-full max-w-[420px] my-auto py-4 ${formAnimationClass}`}>
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex justify-center mb-6">
            <Logo theme="dark" size="md" />
          </div>

          {/* Form Header */}
          <div className="mb-6 text-left">
            <h2 className="font-display text-[28px] font-bold text-slate-900 tracking-hero leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-[14px] text-slate-500 leading-normal">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Content */}
          <div className="w-full">
            {children}
          </div>

          {/* Footer Link */}
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

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useMouseGlow } from '../../hooks/useMouseGlow';
import IntroSplash from '../auth/IntroSplash';
import { useIntro } from '../auth/IntroContext';
import BrandFlow from '../auth/BrandFlow';
import FeatureGrid from '../auth/FeatureGrid';
import RolePills from '../auth/RolePills';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerLink = null,
  isLeaving = false,
}) {
  const location = useLocation();
  const { introDone, shouldRunIntro } = useIntro();
  const { containerRef, spotlightStyle, parallaxStyle } = useMouseGlow();

  const [isInitialMount, setIsInitialMount] = useState(false);
  const [slideDirection, setSlideDirection] = useState('forward');

  useEffect(() => {
    // Wait until intro finishes before triggering panel slide entrance
    if (!introDone) return;

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
  }, [introDone, location.pathname]);

  const formAnimationClass = isLeaving
    ? 'animate-slide-out-right'
    : !introDone
    ? ''
    : isInitialMount || slideDirection === 'forward'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left-fast';

  return (
    <>
      {shouldRunIntro && !introDone && <IntroSplash />}
      <div className="h-dvh w-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden select-none">
        {/* ========================================================= */}
        {/* LEFT: BRAND PANEL (~48% desktop, hidden on mobile)         */}
        {/* ========================================================= */}
        <div
          ref={containerRef}
          className={`hidden lg:flex lg:w-[48%] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-950 px-8 py-6 xl:px-12 xl:py-8 text-white border-r border-slate-800/80 transition-opacity duration-300 ${
            isLeaving ? 'opacity-40' : 'opacity-100'
          } ${isInitialMount && introDone ? 'animate-slide-in-left' : ''}`}
        >
          {/* Aurora layer: two slow-drifting radial gradients (20s loop, transform only) with mouse parallax */}
          <div
            style={parallaxStyle}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-violet-600/20 blur-[100px] animate-aurora-1" />
            <div className="absolute -bottom-28 -right-28 w-[460px] h-[460px] rounded-full bg-teal-500/15 blur-[110px] animate-aurora-2" />
          </div>

          {/* Mouse Spotlight (eased lerp) */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={spotlightStyle}
            aria-hidden="true"
          />

          {/* Faint dotted pattern with vignette mask */}
          <div className="pointer-events-none absolute inset-0 pattern-mesh opacity-60" aria-hidden="true" />

          {/* Top: Logo (exact position and data-brand-logo preserved for intro splash) */}
          <div className="relative z-10 shrink-0" style={!introDone ? { visibility: 'hidden' } : undefined}>
            <Logo theme="light" />
          </div>

          {/* Middle Stack: Headline + How It Works + Feature Grid */}
          <div className="relative z-10 my-auto py-2 space-y-4 xl:space-y-5 max-w-[500px] w-full">
            {/* Section 1: Headline & calm subline */}
            <div
              className={`space-y-2 transition-all duration-300 ${
                introDone ? 'animate-brand-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '0ms' }}
            >
              <h1 className="font-display text-3xl xl:text-[38px] font-extrabold tracking-hero text-white leading-[1.12]">
                Run your recurring revenue on{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-teal-200 to-violet-300">
                  autopilot
                </span>
                .
              </h1>
              <p className="text-xs xl:text-sm text-slate-300 leading-relaxed max-w-md">
                One platform for plans, subscriptions, invoices and payments, built for teams that bill every month.
              </p>
            </div>

            {/* Section 2: "HOW IT WORKS" mini flow (5 connected steps) */}
            <div
              className={`space-y-1.5 transition-all duration-300 ${
                introDone ? 'animate-brand-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '150ms' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300/90">
                How it works
              </p>
              <BrandFlow introDone={introDone} />
            </div>

            {/* Section 3: FEATURE GRID (2x2 glass tiles) */}
            <div
              className={`transition-all duration-300 ${
                introDone ? 'animate-brand-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '300ms' }}
            >
              <FeatureGrid />
            </div>
          </div>

          {/* Section 4: Role Pills row (hidden below 760px height to prevent overflow) */}
          <div
            className={`relative z-10 shrink-0 transition-all duration-300 ${
              introDone ? 'animate-brand-fade-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '450ms' }}
          >
            <RolePills />
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT: FORM PANEL (Untouched)                              */}
        {/* Max-w 420px, fits single viewport from 700px height up    */}
        {/* ========================================================= */}
        <div className="flex-1 h-full flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
          <div className={`w-full max-w-[420px] my-auto py-4 ${formAnimationClass}`}>
            {/* Mobile Logo Only */}
            <div className="lg:hidden flex justify-center mb-6" style={!introDone ? { visibility: 'hidden' } : undefined}>
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
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntro } from './IntroContext';

export const INTRO_TIMINGS = {
  EMBLEM_DRAW_START: 0,
  EMBLEM_DRAW_END: 1000,
  WORDMARK_START: 900,
  WORDMARK_END: 2000,
  HOLD_START: 2000,
  HOLD_END: 2300,
  FLY_START: 2300,
  FLY_END: 3200,
  FLY_DURATION: 900,
  TOTAL_DURATION: 3200,
  SAFETY_TIMEOUT: 5000,
};

const LETTERS = ['B', 'r', 'i', 'g', 'h', 't', 'l', 'o', 'o', 'p'];

/**
 * Find the currently visible target Logo in the AuthLayout (desktop brand panel or mobile form header)
 */
export function getVisibleTargetLogo() {
  if (typeof document === 'undefined') return null;
  const logos = document.querySelectorAll('[data-brand-logo]');
  for (const el of logos) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

export default function IntroSplash() {
  const { setIntroDone } = useIntro();

  const overlayRef = useRef(null);
  const splashLogoRef = useRef(null);
  const pathRef = useRef(null);

  const [pathLength, setPathLength] = useState(100);
  const [emblemProgress, setEmblemProgress] = useState(0);
  const [wordmarkProgress, setWordmarkProgress] = useState(0);
  const [shimmerProgress, setShimmerProgress] = useState(0);
  const [shimmerActive, setShimmerActive] = useState(false);

  const rafIdRef = useRef(null);
  const safetyTimerRef = useRef(null);
  const isEndingRef = useRef(false);
  const targetLogoRef = useRef(null);

  // Restore scroll and notify completion
  const finishIntro = useCallback(() => {
    if (targetLogoRef.current) {
      targetLogoRef.current.style.visibility = '';
    }
    document.body.style.overflow = '';
    setIntroDone(true);
  }, [setIntroDone]);

  // Fast 200ms skip handler (click anywhere, ESC key, or Skip button)
  const handleSkip = useCallback(() => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    const targetEl = getVisibleTargetLogo();
    if (targetEl) targetEl.style.visibility = '';

    if (overlayRef.current) {
      const fadeAnim = overlayRef.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      );
      fadeAnim.onfinish = finishIntro;
    } else {
      finishIntro();
    }
  }, [finishIntro]);

  // Phase 5: FLIP Fly-To-Place execution
  const triggerFly = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    try {
      // Re-measure right before the fly step as requested
      const targetEl = getVisibleTargetLogo();
      targetLogoRef.current = targetEl;

      if (!targetEl || !splashLogoRef.current || !overlayRef.current) {
        // Fallback: simple fade out if measurement target is missing
        if (overlayRef.current) {
          const fadeAnim = overlayRef.current.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 400, easing: 'ease-out', fill: 'forwards' }
          );
          await fadeAnim.finished;
        }
        finishIntro();
        return;
      }

      // Hide real Logo to prevent duplicate or flash during travel
      targetEl.style.visibility = 'hidden';

      const targetRect = targetEl.getBoundingClientRect();
      const splashRect = splashLogoRef.current.getBoundingClientRect();

      const scaleX = targetRect.width / splashRect.width;
      const scaleY = targetRect.height / splashRect.height;
      const deltaX = targetRect.left - splashRect.left;
      const deltaY = targetRect.top - splashRect.top;

      // Web Animations API: 60fps GPU transform with requested easing
      const flyAnim = splashLogoRef.current.animate(
        [
          { transform: 'translate(0px, 0px) scale(1, 1)' },
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
        ],
        {
          duration: INTRO_TIMINGS.FLY_DURATION,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      // Concurrent overlay fade-out revealing the underlying login layout
      const fadeAnim = overlayRef.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: INTRO_TIMINGS.FLY_DURATION,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      await Promise.all([flyAnim.finished, fadeAnim.finished]);

      // Swap at landing: show the real Logo, remove splash, unmount
      targetEl.style.visibility = '';
      finishIntro();
    } catch (err) {
      console.warn('Intro fly animation fallback:', err);
      finishIntro();
    }
  }, [finishIntro]);

  useEffect(() => {
    // 1. Lock body scroll during intro
    document.body.style.overflow = 'hidden';

    // 2. Measure SVG path length accurately
    if (pathRef.current) {
      try {
        const len = pathRef.current.getTotalLength();
        if (len && len > 0) setPathLength(len);
      } catch (e) {
        // Fallback default length
      }
    }

    // 3. Hard safety timeout (force ends after 5s)
    safetyTimerRef.current = setTimeout(() => {
      handleSkip();
    }, INTRO_TIMINGS.SAFETY_TIMEOUT);

    // 4. Keyboard listener for ESC key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);

    // 5. Wait for Plus Jakarta Sans font before starting to avoid text flash
    let isMounted = true;
    let startTime = null;

    const runLoop = (timestamp) => {
      if (!isMounted || isEndingRef.current) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Phase 2: Emblem Draw (0 to 1.0s)
      if (elapsed < INTRO_TIMINGS.EMBLEM_DRAW_END) {
        setEmblemProgress(Math.min(elapsed / INTRO_TIMINGS.EMBLEM_DRAW_END, 1));
      } else {
        setEmblemProgress(1);
      }

      // Phase 3: Wordmark Write (0.9 to 2.0s)
      if (elapsed >= INTRO_TIMINGS.WORDMARK_START && elapsed < INTRO_TIMINGS.WORDMARK_END) {
        const wProgress =
          (elapsed - INTRO_TIMINGS.WORDMARK_START) /
          (INTRO_TIMINGS.WORDMARK_END - INTRO_TIMINGS.WORDMARK_START);
        setWordmarkProgress(Math.min(wProgress, 1));
      } else if (elapsed >= INTRO_TIMINGS.WORDMARK_END) {
        setWordmarkProgress(1);
      }

      // Phase 4: Hold & Shimmer Sweep (2.0 to 2.3s)
      if (elapsed >= INTRO_TIMINGS.HOLD_START && elapsed < INTRO_TIMINGS.HOLD_END) {
        setShimmerActive(true);
        const sProgress =
          (elapsed - INTRO_TIMINGS.HOLD_START) /
          (INTRO_TIMINGS.HOLD_END - INTRO_TIMINGS.HOLD_START);
        setShimmerProgress(Math.min(sProgress, 1));
      } else if (elapsed >= INTRO_TIMINGS.HOLD_END) {
        setShimmerActive(false);
      }

      // Phase 5: Fly to Place Trigger (2.3s)
      if (elapsed >= INTRO_TIMINGS.FLY_START) {
        triggerFly();
      } else {
        rafIdRef.current = requestAnimationFrame(runLoop);
      }
    };

    const startAnimation = async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch (e) {
        // ignore
      }
      if (isMounted) {
        rafIdRef.current = requestAnimationFrame(runLoop);
      }
    };

    startAnimation();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (targetLogoRef.current) targetLogoRef.current.style.visibility = '';
      document.body.style.overflow = '';
    };
  }, [handleSkip, triggerFly]);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      aria-hidden="true"
      onClick={handleSkip}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-950 text-white select-none cursor-pointer"
    >
      {/* Soft Drift Glow Blobs (Matching brand panel aesthetic) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-violet-600/25 blur-[100px] animate-drift-1" />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full bg-accent-500/20 blur-[110px] animate-drift-2" />
      </div>

      {/* Faint dotted mesh background */}
      <div className="pointer-events-none absolute inset-0 pattern-mesh opacity-50" />

      {/* Main Splash Logo (Emblem + Wordmark) */}
      <div
        ref={splashLogoRef}
        style={{ transformOrigin: 'top left' }}
        className="relative z-10 inline-flex items-center gap-3.5 sm:gap-4 md:gap-5 px-6"
      >
        {/* Emblem Container (Enlarged to ~96px on desktop) */}
        <div
          className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl p-1 transition-all duration-300 shrink-0"
          style={{
            background:
              emblemProgress >= 0.75
                ? 'linear-gradient(to top right, #4f46e5, #6366f1, #2dd4bf)'
                : 'rgba(255, 255, 255, 0.08)',
            boxShadow:
              emblemProgress >= 0.75 && emblemProgress < 1
                ? '0 0 35px rgba(20, 184, 166, 0.65)'
                : '0 4px 20px rgba(0, 0, 0, 0.25)',
            transform:
              emblemProgress >= 0.8 && emblemProgress < 0.95
                ? 'scale(1.08)'
                : 'scale(1)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-white p-2"
          >
            <path
              ref={pathRef}
              d="M6 12C6 9.79086 7.79086 8 10 8C12.2091 8 14 10 14 12C14 14 15.7909 16 18 16C20.2091 16 22 14.2091 22 12C22 9.79086 20.2091 8 18 8C15.7909 8 14 10 14 12C14 14 12.2091 16 10 16C7.79086 16 6 14.2091 6 12Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength * (1 - Math.min(emblemProgress / 0.75, 1)),
                opacity: Math.min(emblemProgress * 4, 1),
              }}
            />
          </svg>
        </div>

        {/* Wordmark Container with Clip-Path Reveal and Pen Dot */}
        <div className="relative overflow-visible select-none whitespace-nowrap">
          <div
            className="relative overflow-hidden"
            style={{
              clipPath: `inset(0 ${Math.max(0, 100 - wordmarkProgress * 100)}% 0 0)`,
            }}
          >
            <span className="font-display font-extrabold text-white tracking-tight text-4xl sm:text-5xl md:text-6xl inline-block leading-none py-1">
              {LETTERS.map((char, i) => {
                const letterThreshold = (i + 0.3) / LETTERS.length;
                const isPast = wordmarkProgress >= letterThreshold;
                return (
                  <span
                    key={i}
                    className="inline-block transition-all duration-150"
                    style={{
                      transform: isPast ? 'translateY(0)' : 'translateY(4px)',
                      filter: isPast ? 'blur(0px)' : 'blur(4px)',
                      opacity: isPast ? 1 : 0.6,
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>

            {/* Hold Phase Shimmer Sweep */}
            {shimmerActive && (
              <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{
                  transform: `translateX(${-100 + shimmerProgress * 250}%)`,
                }}
              />
            )}
          </div>

          {/* Glowing Cursor/Pen Dot Riding the Reveal Edge */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-accent-300 shadow-[0_0_12px_#2dd4bf,0_0_24px_#14b8a6] pointer-events-none transition-opacity duration-150"
            style={{
              left: `${wordmarkProgress * 100}%`,
              opacity: wordmarkProgress > 0 && wordmarkProgress < 1 ? 1 : 0,
            }}
          />
        </div>
      </div>

      {/* Accessible Skip Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        aria-label="Skip intro"
        className="absolute bottom-6 right-6 z-50 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer"
      >
        Skip
      </button>
    </div>
  );
}

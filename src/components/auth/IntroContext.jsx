import React, { createContext, useContext, useState } from 'react';

const IntroContext = createContext({
  introDone: true,
  setIntroDone: () => {},
  shouldRunIntro: false,
});

export const INTRO_STORAGE_KEY = 'brightloop_intro_seen';

export function IntroProvider({ children }) {
  // Determine on initial mount whether this session qualifies for the cinematic intro
  const [shouldRunIntro] = useState(() => {
    if (typeof window === 'undefined') return false;

    // 1. Reduced motion preference: skip completely
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
      return false;
    }

    // 2. Already seen in this browser session: never repeat
    if (sessionStorage.getItem(INTRO_STORAGE_KEY)) {
      return false;
    }

    // 3. Must be initial entry on an auth route (/login or / which redirects to /login)
    const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
    const currentPath = window.location.pathname.toLowerCase();
    const isAuthRoute = authPaths.some(
      (p) => currentPath === p || currentPath.startsWith('/reset-password/')
    );

    if (!isAuthRoute) {
      return false;
    }

    // Mark as seen immediately so any reload or quick route change does not trigger it again
    sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
    return true;
  });

  const [introDone, setIntroDone] = useState(!shouldRunIntro);

  return (
    <IntroContext.Provider value={{ introDone, setIntroDone, shouldRunIntro }}>
      {children}
    </IntroContext.Provider>
  );
}

export function useIntro() {
  return useContext(IntroContext);
}

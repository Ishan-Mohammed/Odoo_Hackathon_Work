/**
 * Environment & Feature Flag Configuration
 * ============================================================
 * Supports global mock switch (VITE_USE_MOCK) and granular per-module
 * switches (VITE_REAL_MODULES) for incremental backend wiring.
 */

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK !== 'false';
export const USE_REAL_AUTH = import.meta.env.VITE_USE_REAL_AUTH === 'true';

const realModulesSet = new Set(
  (import.meta.env.VITE_REAL_MODULES || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Returns true if a specific module should call the real backend.
 * - When VITE_USE_MOCK=true (or USE_MOCK is true): MOCK ALWAYS WINS (returns false).
 * - When VITE_USE_MOCK=false: routes to real backend if allowlisted or wildcard.
 */
export function isReal(moduleName) {
  // If global mock is enabled, force mock mode everywhere (mock wins)
  if (USE_MOCK) return false;

  const mod = (moduleName || '').toLowerCase();
  if (USE_REAL_AUTH && mod === 'auth') return true;

  if (realModulesSet.size === 0 || realModulesSet.has('all') || realModulesSet.has('*')) {
    return true;
  }
  return realModulesSet.has(mod);
}

/**
 * Returns true if write operations (POST/PATCH/DELETE) for a catalog module are real.
 * Controlled by module-name-write (e.g. products-write, plans-write, taxes-write, discounts-write, templates-write).
 * When USE_MOCK is true, always returns false.
 */
export function isRealWrite(moduleName) {
  if (USE_MOCK) return false;
  if (realModulesSet.has('all') || realModulesSet.has('*')) return true;
  return realModulesSet.has(`${(moduleName || '').toLowerCase()}-write`);
}

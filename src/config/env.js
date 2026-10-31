/**
 * Environment & Feature Flag Configuration
 * ============================================================
 * Supports global mock switch (VITE_USE_MOCK) and granular per-module
 * switches (VITE_REAL_MODULES) for incremental backend wiring.
 */

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const USE_REAL_AUTH = import.meta.env.VITE_USE_REAL_AUTH === 'true';

const realModulesSet = new Set(
  (import.meta.env.VITE_REAL_MODULES || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Returns true if a specific module should call the real backend.
 * - If VITE_USE_MOCK === 'false': all modules default to real unless VITE_REAL_MODULES is specified as an allowlist.
 * - If VITE_USE_REAL_AUTH is true: auth is real even in mock mode.
 * - Supports wildcard 'all' or '*' in VITE_REAL_MODULES.
 */
export function isReal(moduleName) {
  const mod = (moduleName || '').toLowerCase();

  // Special-case: auth override flag
  if (mod === 'auth' && USE_REAL_AUTH) return true;

  // If global mock is enabled, everything is mock unless explicitly flagged
  if (USE_MOCK) {
    if (realModulesSet.has('all') || realModulesSet.has('*')) return true;
    return realModulesSet.has(mod);
  }

  // If global mock is disabled (VITE_USE_MOCK=false):
  // If no specific module list is given, everything is real
  if (realModulesSet.size === 0 || realModulesSet.has('all') || realModulesSet.has('*')) {
    return true;
  }

  // If a list was provided, only modules in that list are real
  return realModulesSet.has(mod);
}

/**
 * Returns true if write operations (POST/PATCH/DELETE) for a catalog module are real.
 * Controlled by module-name-write (e.g. products-write, plans-write, taxes-write, discounts-write, templates-write).
 */
export function isRealWrite(moduleName) {
  if (USE_MOCK) return false;
  if (realModulesSet.has('all') || realModulesSet.has('*')) return true;
  return realModulesSet.has(`${(moduleName || '').toLowerCase()}-write`);
}

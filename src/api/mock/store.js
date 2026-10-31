import { DEMO_PASSWORD } from '../../config/demoCredentials';
import {
  mockCustomers,
  mockProducts,
  mockPlans,
  mockTaxes,
  mockDiscounts,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
} from './db';

const STORAGE_KEY = 'brightloop_mock_store_v2';
const SCHEMA_VERSION = 2;

// In-memory fallback if localStorage fails or is in private browsing
let memoryStore = null;

// Listeners for store changes within the same tab
const listeners = new Set();

export const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const roundMoney = (val) => {
  const num = Number(val || 0);
  return Math.round(num * 100) / 100;
};

export const createError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  err.status =
    code === 'FORBIDDEN'
      ? 403
      : code === 'UNAUTHORIZED'
      ? 401
      : code === 'NOT_FOUND'
      ? 404
      : code === 'DUPLICATE_EMAIL' || code === 'CONFLICT'
      ? 409
      : code === 'OVERPAYMENT' || code === 'VALIDATION' || code === 'NOT_CONFIRMED' || code === 'CANCELLED' || code === 'ILLEGAL_TRANSITION'
      ? 400
      : 400;
  err.response = {
    status: err.status,
    data: { code, message },
  };
  return err;
};

export function computeInvoiceStatus(inv) {
  if (!inv) return 'Draft';
  if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Draft') {
    return inv.status;
  }
  const currentToday = today();
  if (inv.dueDate && String(inv.dueDate) < currentToday && roundMoney(inv.outstanding) > 0.005) {
    return 'Overdue';
  }
  return inv.status || 'Confirmed';
}

export function computeInvoiceDaysOverdue(inv) {
  if (!inv?.dueDate) return 0;
  const currentToday = today();
  if (String(inv.dueDate) >= currentToday) return 0;
  const due = new Date(inv.dueDate).getTime();
  const now = new Date(currentToday).getTime();
  const diff = Math.round((now - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function createInitialSeed() {
  const initialUsers = [
    {
      id: 'usr_admin_01',
      name: 'Admin',
      email: 'admin@brightloop.com',
      password: 'Admin@1234',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr_staff_02',
      name: 'Staff',
      email: 'staff@brightloop.com',
      password: 'Staff@1234',
      role: 'staff',
      created_at: '2026-01-15T09:00:00Z',
    },
    {
      id: 'usr_cust_01',
      customerId: 'cust_01',
      name: 'Acme Traders',
      email: 'customer@acme.com',
      password: 'Customer@1234',
      role: 'customer',
      created_at: '2026-02-01T10:00:00Z',
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    users: initialUsers,
    customers: JSON.parse(JSON.stringify(mockCustomers || [])),
    products: JSON.parse(JSON.stringify(mockProducts || [])),
    plans: JSON.parse(JSON.stringify(mockPlans || [])),
    taxes: JSON.parse(JSON.stringify(mockTaxes || [])),
    discounts: JSON.parse(JSON.stringify(mockDiscounts || [])),
    templates: [],
    subscriptions: JSON.parse(JSON.stringify(mockSubscriptions || [])),
    invoices: JSON.parse(JSON.stringify(mockInvoices || [])),
    payments: JSON.parse(JSON.stringify(mockPayments || [])),
    reminders: [],
  };
}

export function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === SCHEMA_VERSION) {
          const adminUser = (parsed.users || []).find(
            (u) => String(u.email || '').toLowerCase() === 'admin@brightloop.com'
          );
          if (!adminUser || adminUser.password !== 'Admin@1234') {
            const reseeded = createInitialSeed();
            saveStore(reseeded);
            memoryStore = reseeded;
            return reseeded;
          }
          memoryStore = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read brightloop_mock_store_v2 from localStorage:', err);
  }

  if (memoryStore && memoryStore.schemaVersion === SCHEMA_VERSION) {
    return memoryStore;
  }

  return resetStore();
}

export function saveStore(store) {
  if (!store) return;
  store.schemaVersion = SCHEMA_VERSION;
  memoryStore = store;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch (err) {
    console.warn('Failed to save brightloop_mock_store_v2 to localStorage:', err);
  }

  // Notify active subscribers
  listeners.forEach((listener) => {
    try {
      listener(store);
    } catch (err) {
      console.error('Store subscriber error:', err);
    }
  });
}

export function resetStore() {
  const fresh = createInitialSeed();
  saveStore(fresh);
  return fresh;
}

export function nextNumber(prefix) {
  const store = getStore();
  const upper = String(prefix || '').toUpperCase();

  if (upper === 'SUB') {
    let maxNum = 42;
    (store.subscriptions || []).forEach((s) => {
      const numStr = s.subscriptionNumber || s.number || '';
      const match = numStr.match(/SUB-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    });
    return `SUB-${String(maxNum + 1).padStart(4, '0')}`;
  }

  if (upper === 'INV') {
    let maxNum = 69;
    (store.invoices || []).forEach((inv) => {
      const numStr = inv.number || inv.invoiceNumber || '';
      const match = numStr.match(/INV-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    });
    return `INV-${String(maxNum + 1).padStart(4, '0')}`;
  }

  if (upper === 'PAY') {
    let maxNum = 100;
    (store.payments || []).forEach((p) => {
      const numStr = p.id || '';
      const match = numStr.match(/pay_(\d+)/i) || numStr.match(/PAY-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    });
    return `PAY-${String(maxNum + 1).padStart(4, '0')}`;
  }

  return `${upper}-${Date.now()}`;
}

export function subscribe(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);

  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const updated = JSON.parse(e.newValue);
        if (updated && updated.schemaVersion === SCHEMA_VERSION) {
          memoryStore = updated;
          cb(updated);
        }
      } catch (err) {
        console.error('Storage event parsing error:', err);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function getSessionUser() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('brightloop_user');
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function requireRole(...allowedRoles) {
  const user = getSessionUser();
  if (!user) {
    throw createError('FORBIDDEN', 'Authentication required');
  }

  const role = String(user.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  if (!normalizedAllowed.includes(role)) {
    if (normalizedAllowed.length === 1 && normalizedAllowed[0] === 'admin') {
      throw createError('FORBIDDEN', 'Admin access only');
    }
    throw createError('FORBIDDEN', `Permission denied. Requires [${allowedRoles.join(', ')}] role.`);
  }

  return user;
}

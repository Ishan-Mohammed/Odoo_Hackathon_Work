/**
 * Brightloop Central In-Memory Mock Database
 * ============================================================
 * Worked hackathon reference (INV-0042 — must match exactly):
 *   Product : Brightloop CRM (Brand: Odoo) = 2,560 / seat
 *   Customer: Acme Traders, 5 seats
 *   Subtotal: 5 × 2,560 = 12,800.00
 *   Discount: BULK10 (10%) = −1,280.00
 *   Taxable : 11,520.00
 *   GST 18% : 2,073.60
 *   Total   : 13,593.60   ← Paid by UPI in full
 * ============================================================
 */

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns YYYY-MM-DD for the first day of a given month offset from today */
function monthStart(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().split('T')[0];
}

/** Returns YYYY-MM-DD for the last day of a given month offset from today */
function monthEnd(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// CUSTOMERS (12)
// ─────────────────────────────────────────────
export const mockCustomers = [
  { id: 'cust_01', name: 'Acme Traders',       email: 'billing@acme.com',             phone: '+91 98765 43210', city: 'Mumbai',    address: '14 Marine Lines, Mumbai 400 002', activeSubscriptions: 3, totalSpend: 245000.0 },
  { id: 'cust_02', name: 'Zenith Logistics',    email: 'ops@zenithlogistics.in',        phone: '+91 98220 11223', city: 'Bangalore', address: '7 MG Road, Bangalore 560 001',   activeSubscriptions: 2, totalSpend: 180000.0 },
  { id: 'cust_03', name: 'Nova Healthtech',     email: 'finance@novahealth.co',         phone: '+91 99341 55667', city: 'Hyderabad', address: '22 Banjara Hills, Hyderabad 500 034', activeSubscriptions: 4, totalSpend: 540000.0 },
  { id: 'cust_04', name: 'Apex Retailers',      email: 'accounts@apexretail.in',        phone: '+91 97112 33445', city: 'Delhi',     address: '5 Connaught Place, New Delhi 110 001', activeSubscriptions: 1, totalSpend: 95000.0 },
  { id: 'cust_05', name: 'Kavita Textiles',     email: 'kavita@textiles.com',           phone: '+91 94250 88776', city: 'Surat',     address: '88 Ring Road, Surat 395 002',    activeSubscriptions: 2, totalSpend: 125000.0 },
  { id: 'cust_06', name: 'BluePeak Analytics',  email: 'admin@bluepeak.io',             phone: '+91 98860 99001', city: 'Pune',      address: '3 Koregaon Park, Pune 411 001',  activeSubscriptions: 5, totalSpend: 820000.0 },
  { id: 'cust_07', name: 'Matrix Hospitality',  email: 'matrix@hotels.in',              phone: '+91 98100 44556', city: 'Jaipur',    address: '101 MI Road, Jaipur 302 001',    activeSubscriptions: 1, totalSpend: 65000.0 },
  { id: 'cust_08', name: 'Starlight Media',     email: 'billing@starlight.agency',      phone: '+91 97401 22334', city: 'Chennai',   address: '9 Anna Salai, Chennai 600 002',  activeSubscriptions: 3, totalSpend: 310000.0 },
  { id: 'cust_09', name: 'Falcon Agro Corp',    email: 'procure@falconagro.com',        phone: '+91 93122 77889', city: 'Chandigarh',address: '44 Sector 17, Chandigarh 160 017', activeSubscriptions: 2, totalSpend: 195000.0 },
  { id: 'cust_10', name: 'Elevate EdTech',      email: 'accounts@elevate.study',        phone: '+91 98990 66778', city: 'Noida',     address: '12 Sector 62, Noida 201 301',    activeSubscriptions: 4, totalSpend: 460000.0 },
  { id: 'cust_11', name: 'Quantum FinServ',     email: 'accounts@quantumfin.in',        phone: '+91 98711 12345', city: 'Mumbai',    address: '33 Nariman Point, Mumbai 400 021', activeSubscriptions: 3, totalSpend: 620000.0 },
  { id: 'cust_12', name: 'UrbanCraft Interiors',email: 'hello@urbancraft.design',       phone: '+91 99200 88990', city: 'Kolkata',   address: '6 Park Street, Kolkata 700 016', activeSubscriptions: 1, totalSpend: 45000.0 },
];

// ─────────────────────────────────────────────
// PLANS (used by subscriptions)
// ─────────────────────────────────────────────
export const mockPlans = [
  { id: 'pln_monthly', name: 'CRM Monthly',   billingPeriod: 'monthly',  periodDays: 30 },
  { id: 'pln_quarterly', name: 'CRM Quarterly', billingPeriod: 'quarterly', periodDays: 90 },
];

// ─────────────────────────────────────────────
// SUBSCRIPTIONS
// Seed so that 3 are due today (nextBillingDate <= today)
// for the Run Billing demo.
// ─────────────────────────────────────────────

/** Mutable array — Run Billing mutates nextBillingDate after a real run */
export const mockSubscriptions = [
  // ── Worked-example subscription (already has INV-0042 billed) ──
  {
    id: 'sub_0042',
    subscriptionNumber: 'SUB-0042',
    customerId: 'cust_01',
    customerName: 'Acme Traders',
    planId: 'pln_monthly',
    planName: 'CRM Monthly',
    billingPeriod: 'monthly',
    seats: 5,
    unitPrice: 2560.0,
    discountCode: 'BULK10',
    discountRate: 0.10,
    taxLabel: 'GST 18%',
    taxRate: 0.18,
    mrr: 11520.0,
    status: 'Active',
    // nextBillingDate is NEXT month — already billed for Oct period
    nextBillingDate: dateOffset(30),
    startDate: '2026-03-12',
    createdAt: '2026-03-10T10:00:00Z',
  },

  // ── 3 subscriptions DUE TODAY / overdue — will be created on first Run Billing ──
  {
    id: 'sub_0010',
    subscriptionNumber: 'SUB-0010',
    customerId: 'cust_02',
    customerName: 'Zenith Logistics',
    planId: 'pln_monthly',
    planName: 'CRM Monthly',
    billingPeriod: 'monthly',
    seats: 4,
    unitPrice: 2000.0,
    discountCode: null,
    discountRate: 0,
    taxLabel: 'GST 18%',
    taxRate: 0.18,
    mrr: 8000.0,
    status: 'Active',
    nextBillingDate: today(),         // ← DUE TODAY
    startDate: '2026-09-01',
    createdAt: '2026-08-30T10:00:00Z',
  },
  {
    id: 'sub_0015',
    subscriptionNumber: 'SUB-0015',
    customerId: 'cust_06',
    customerName: 'BluePeak Analytics',
    planId: 'pln_monthly',
    planName: 'CRM Monthly',
    billingPeriod: 'monthly',
    seats: 10,
    unitPrice: 2350.0,
    discountCode: null,
    discountRate: 0,
    taxLabel: 'GST 18%',
    taxRate: 0.18,
    mrr: 23500.0,
    status: 'Active',
    nextBillingDate: dateOffset(-2),  // ← 2 days overdue
    startDate: '2026-07-15',
    createdAt: '2026-07-13T10:00:00Z',
  },
  {
    id: 'sub_0021',
    subscriptionNumber: 'SUB-0021',
    customerId: 'cust_11',
    customerName: 'Quantum FinServ',
    planId: 'pln_quarterly',
    planName: 'CRM Quarterly',
    billingPeriod: 'quarterly',
    seats: 6,
    unitPrice: 2700.0,
    discountCode: null,
    discountRate: 0,
    taxLabel: 'GST 18%',
    taxRate: 0.18,
    mrr: 16200.0,
    status: 'Active',
    nextBillingDate: dateOffset(-5),  // ← 5 days overdue
    startDate: '2026-01-01',
    createdAt: '2025-12-28T10:00:00Z',
  },

  // ── Remaining bulk subscriptions (various statuses, future billing) ──
  ...Array.from({ length: 36 }).map((_, i) => {
    const idx  = i + 1;
    const cust = mockCustomers[(idx + 3) % mockCustomers.length];
    const statuses = ['Active', 'Active', 'Paused', 'Draft', 'Closed'];
    const status   = statuses[idx % statuses.length];
    const seats    = ((idx % 8) + 2) * 2;
    const up       = 2000 + (idx % 5) * 200;

    return {
      id: `sub_${String(idx + 100).padStart(4, '0')}`,
      subscriptionNumber: `SUB-${String(idx + 100).padStart(4, '0')}`,
      customerId: cust.id,
      customerName: cust.name,
      planId: 'pln_monthly',
      planName: 'CRM Monthly',
      billingPeriod: 'monthly',
      seats,
      unitPrice: up,
      discountCode: null,
      discountRate: 0,
      taxLabel: 'GST 18%',
      taxRate: 0.18,
      mrr: Math.round(seats * up * 0.9),
      status,
      nextBillingDate: dateOffset(idx * 3 + 5),
      startDate: '2025-04-01',
      createdAt: '2025-03-28T10:00:00Z',
    };
  }),
];

// ─────────────────────────────────────────────
// INVOICES (mutable — Run Billing appends here)
// ─────────────────────────────────────────────

/**
 * Full invoice shape:
 * { id, number, subscriptionId, subscriptionNumber, customerId, customerName,
 *   periodStart, periodEnd, subtotal, discountTotal, taxTotal, total,
 *   paidAmount, outstanding, dueDate, status, daysOverdue,
 *   discountLabel, taxLabel,
 *   lines: [{ id, description, qty, unitPrice, taxLabel, amount }],
 *   payments: [{ id, method, amount, date, note }],
 *   customer: { name, email, address },
 *   createdAt }
 */

// Helper to compute daysOverdue dynamically at query time
export function computeStatus(inv) {
  if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Draft') {
    return inv.status;
  }
  const now   = new Date();
  const due   = new Date(inv.dueDate);
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueTs   = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  if (dueTs < todayTs) return 'Overdue';
  return inv.status; // Confirmed
}

export function computeDaysOverdue(inv) {
  if (!inv.dueDate) return 0;
  const now   = new Date();
  const due   = new Date(inv.dueDate);
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueTs   = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff    = Math.round((todayTs - dueTs) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export const mockInvoices = [
  // ═══════════════════════════════════════════════
  // INV-0042  Worked Example — Acme Traders (PAID)
  // ═══════════════════════════════════════════════
  {
    id: 'inv_0042',
    number: 'INV-0042',
    /** backward-compat alias for dashboard */ invoiceNumber: 'INV-0042',
    subscriptionId: 'sub_0042',
    subscriptionNumber: 'SUB-0042',
    customerId: 'cust_01',
    customerName: 'Acme Traders',
    periodStart: '2026-10-01',
    periodEnd:   '2026-10-31',
    subtotal:       12800.00,
    discountTotal:   1280.00,
    taxTotal:        2073.60,
    total:          13593.60,
    paidAmount:     13593.60,
    outstanding:        0.00,
    dueDate:   '2026-10-20',
    status:    'Paid',
    daysOverdue: 0,
    discountLabel: 'BULK10 (10%)',
    taxLabel:      'GST 18%',
    createdAt: '2026-10-01T09:00:00Z',
    customer: {
      name:    'Acme Traders',
      email:   'billing@acme.com',
      address: '14 Marine Lines, Mumbai 400 002',
    },
    lines: [
      {
        id: 'line_0042_1',
        description: 'Brightloop CRM (Brand: Odoo) — Oct 2026',
        qty: 5,
        unitPrice: 2560.00,
        taxLabel: 'GST 18%',
        amount: 12800.00,
      },
    ],
    payments: [
      {
        id: 'pay_0042_1',
        invoiceId: 'inv_0042',
        invoiceNumber: 'INV-0042',
        customerName: 'Acme Traders',
        method: 'UPI',
        amount: 13593.60,
        date: '2026-10-12T10:30:00Z',
        note: 'UPI transfer — BULK10 client',
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // Overdue invoices (Confirmed with past dueDate)
  // ═══════════════════════════════════════════════
  {
    id: 'inv_0043',
    number: 'INV-0043', invoiceNumber: 'INV-0043',
    subscriptionId: 'sub_0107', subscriptionNumber: 'SUB-0107',
    customerId: 'cust_07', customerName: 'Matrix Hospitality',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 45200.00, discountTotal: 0, taxTotal: 8136.00, total: 45200.00,
    paidAmount: 0, outstanding: 45200.00,
    dueDate: dateOffset(-6),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 40 * 864e5).toISOString(),
    customer: { name: 'Matrix Hospitality', email: 'matrix@hotels.in', address: '101 MI Road, Jaipur 302 001' },
    lines: [{ id: 'line_0043_1', description: 'Brightloop CRM — Sep 2026', qty: 8, unitPrice: 5650, taxLabel: 'GST 18%', amount: 45200 }],
    payments: [],
  },
  {
    id: 'inv_0044',
    number: 'INV-0044', invoiceNumber: 'INV-0044',
    subscriptionId: 'sub_0109', subscriptionNumber: 'SUB-0109',
    customerId: 'cust_09', customerName: 'Falcon Agro Corp',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 28400.00, discountTotal: 0, taxTotal: 5112.00, total: 28400.00,
    paidAmount: 0, outstanding: 28400.00,
    dueDate: dateOffset(-14),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 50 * 864e5).toISOString(),
    customer: { name: 'Falcon Agro Corp', email: 'procure@falconagro.com', address: '44 Sector 17, Chandigarh 160 017' },
    lines: [{ id: 'line_0044_1', description: 'Brightloop CRM — Sep 2026', qty: 4, unitPrice: 7100, taxLabel: 'GST 18%', amount: 28400 }],
    payments: [],
  },
  {
    id: 'inv_0045',
    number: 'INV-0045', invoiceNumber: 'INV-0045',
    subscriptionId: 'sub_0112', subscriptionNumber: 'SUB-0112',
    customerId: 'cust_12', customerName: 'UrbanCraft Interiors',
    periodStart: monthStart(-3), periodEnd: monthEnd(-3),
    subtotal: 18600.00, discountTotal: 0, taxTotal: 3348.00, total: 18600.00,
    paidAmount: 0, outstanding: 18600.00,
    dueDate: dateOffset(-21),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
    customer: { name: 'UrbanCraft Interiors', email: 'hello@urbancraft.design', address: '6 Park Street, Kolkata 700 016' },
    lines: [{ id: 'line_0045_1', description: 'Brightloop CRM — Aug 2026', qty: 2, unitPrice: 9300, taxLabel: 'GST 18%', amount: 18600 }],
    payments: [],
  },
  {
    id: 'inv_0046',
    number: 'INV-0046', invoiceNumber: 'INV-0046',
    subscriptionId: 'sub_0105', subscriptionNumber: 'SUB-0105',
    customerId: 'cust_05', customerName: 'Kavita Textiles',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 34100.00, discountTotal: 0, taxTotal: 6138.00, total: 34100.00,
    paidAmount: 0, outstanding: 34100.00,
    dueDate: dateOffset(-4),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 35 * 864e5).toISOString(),
    customer: { name: 'Kavita Textiles', email: 'kavita@textiles.com', address: '88 Ring Road, Surat 395 002' },
    lines: [{ id: 'line_0046_1', description: 'Brightloop CRM — Sep 2026', qty: 5, unitPrice: 6820, taxLabel: 'GST 18%', amount: 34100 }],
    payments: [],
  },
  {
    id: 'inv_0047',
    number: 'INV-0047', invoiceNumber: 'INV-0047',
    subscriptionId: 'sub_0102', subscriptionNumber: 'SUB-0102',
    customerId: 'cust_02', customerName: 'Zenith Logistics',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 62000.00, discountTotal: 0, taxTotal: 11160.00, total: 62000.00,
    paidAmount: 0, outstanding: 62000.00,
    dueDate: dateOffset(-11),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 45 * 864e5).toISOString(),
    customer: { name: 'Zenith Logistics', email: 'ops@zenithlogistics.in', address: '7 MG Road, Bangalore 560 001' },
    lines: [{ id: 'line_0047_1', description: 'Brightloop CRM — Sep 2026', qty: 12, unitPrice: 5167, taxLabel: 'GST 18%', amount: 62000 }],
    payments: [],
  },
  {
    id: 'inv_0048',
    number: 'INV-0048', invoiceNumber: 'INV-0048',
    subscriptionId: 'sub_0104', subscriptionNumber: 'SUB-0104',
    customerId: 'cust_04', customerName: 'Apex Retailers',
    periodStart: monthStart(-3), periodEnd: monthEnd(-3),
    subtotal: 12500.00, discountTotal: 0, taxTotal: 2250.00, total: 12500.00,
    paidAmount: 0, outstanding: 12500.00,
    dueDate: dateOffset(-18),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 55 * 864e5).toISOString(),
    customer: { name: 'Apex Retailers', email: 'accounts@apexretail.in', address: '5 Connaught Place, New Delhi 110 001' },
    lines: [{ id: 'line_0048_1', description: 'Brightloop CRM — Aug 2026', qty: 2, unitPrice: 6250, taxLabel: 'GST 18%', amount: 12500 }],
    payments: [],
  },
  {
    id: 'inv_0049',
    number: 'INV-0049', invoiceNumber: 'INV-0049',
    subscriptionId: 'sub_0108', subscriptionNumber: 'SUB-0108',
    customerId: 'cust_08', customerName: 'Starlight Media',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 51000.00, discountTotal: 0, taxTotal: 9180.00, total: 51000.00,
    paidAmount: 0, outstanding: 51000.00,
    dueDate: dateOffset(-3),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 38 * 864e5).toISOString(),
    customer: { name: 'Starlight Media', email: 'billing@starlight.agency', address: '9 Anna Salai, Chennai 600 002' },
    lines: [{ id: 'line_0049_1', description: 'Brightloop CRM — Sep 2026', qty: 6, unitPrice: 8500, taxLabel: 'GST 18%', amount: 51000 }],
    payments: [],
  },
  {
    id: 'inv_0050',
    number: 'INV-0050', invoiceNumber: 'INV-0050',
    subscriptionId: 'sub_0110', subscriptionNumber: 'SUB-0110',
    customerId: 'cust_10', customerName: 'Elevate EdTech',
    periodStart: monthStart(-2), periodEnd: monthEnd(-2),
    subtotal: 73800.00, discountTotal: 0, taxTotal: 13284.00, total: 73800.00,
    paidAmount: 0, outstanding: 73800.00,
    dueDate: dateOffset(-9),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 42 * 864e5).toISOString(),
    customer: { name: 'Elevate EdTech', email: 'accounts@elevate.study', address: '12 Sector 62, Noida 201 301' },
    lines: [{ id: 'line_0050_1', description: 'Brightloop CRM — Sep 2026', qty: 9, unitPrice: 8200, taxLabel: 'GST 18%', amount: 73800 }],
    payments: [],
  },

  // ── Draft invoice ──
  {
    id: 'inv_0051',
    number: 'INV-0051', invoiceNumber: 'INV-0051',
    subscriptionId: 'sub_0103', subscriptionNumber: 'SUB-0103',
    customerId: 'cust_03', customerName: 'Nova Healthtech',
    periodStart: monthStart(0), periodEnd: monthEnd(0),
    subtotal: 39600.00, discountTotal: 3960.00, taxTotal: 6415.20, total: 42055.20,
    paidAmount: 0, outstanding: 42055.20,
    dueDate: dateOffset(15),
    status: 'Draft',
    daysOverdue: 0, discountLabel: 'VOL5 (10%)', taxLabel: 'GST 18%',
    createdAt: new Date().toISOString(),
    customer: { name: 'Nova Healthtech', email: 'finance@novahealth.co', address: '22 Banjara Hills, Hyderabad 500 034' },
    lines: [{ id: 'line_0051_1', description: 'Brightloop CRM — Oct 2026', qty: 6, unitPrice: 6600, taxLabel: 'GST 18%', amount: 39600 }],
    payments: [],
  },

  // ── Confirmed (future due) ──
  {
    id: 'inv_0052',
    number: 'INV-0052', invoiceNumber: 'INV-0052',
    subscriptionId: 'sub_0106', subscriptionNumber: 'SUB-0106',
    customerId: 'cust_06', customerName: 'BluePeak Analytics',
    periodStart: monthStart(0), periodEnd: monthEnd(0),
    subtotal: 94000.00, discountTotal: 0, taxTotal: 16920.00, total: 94000.00,
    paidAmount: 0, outstanding: 94000.00,
    dueDate: dateOffset(10),
    status: 'Confirmed',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    customer: { name: 'BluePeak Analytics', email: 'admin@bluepeak.io', address: '3 Koregaon Park, Pune 411 001' },
    lines: [{ id: 'line_0052_1', description: 'Brightloop CRM — Oct 2026', qty: 10, unitPrice: 9400, taxLabel: 'GST 18%', amount: 94000 }],
    payments: [],
  },

  // ── Cancelled ──
  {
    id: 'inv_0053',
    number: 'INV-0053', invoiceNumber: 'INV-0053',
    subscriptionId: 'sub_0111', subscriptionNumber: 'SUB-0111',
    customerId: 'cust_11', customerName: 'Quantum FinServ',
    periodStart: monthStart(-3), periodEnd: monthEnd(-3),
    subtotal: 32400.00, discountTotal: 0, taxTotal: 5832.00, total: 32400.00,
    paidAmount: 0, outstanding: 0,
    dueDate: dateOffset(-25),
    status: 'Cancelled',
    daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
    createdAt: new Date(Date.now() - 70 * 864e5).toISOString(),
    customer: { name: 'Quantum FinServ', email: 'accounts@quantumfin.in', address: '33 Nariman Point, Mumbai 400 021' },
    lines: [{ id: 'line_0053_1', description: 'Brightloop CRM — Aug 2026', qty: 4, unitPrice: 8100, taxLabel: 'GST 18%', amount: 32400 }],
    payments: [],
  },

  // ── 15 more Paid invoices ──
  ...Array.from({ length: 15 }).map((_, i) => {
    const cust   = mockCustomers[i % mockCustomers.length];
    const seats  = (i % 5 + 2);
    const up     = 2000 + i * 300;
    const sub    = seats * up;
    const tax    = +(sub * 0.18).toFixed(2);
    const total  = +(sub + tax).toFixed(2);
    const num    = String(54 + i).padStart(4, '0');
    const mOff   = -(i % 6 + 1);

    return {
      id: `inv_0${num}`,
      number: `INV-0${num}`, invoiceNumber: `INV-0${num}`,
      subscriptionId: `sub_0${num}`, subscriptionNumber: `SUB-0${num}`,
      customerId: cust.id, customerName: cust.name,
      periodStart: monthStart(mOff), periodEnd: monthEnd(mOff),
      subtotal: sub, discountTotal: 0, taxTotal: tax, total,
      paidAmount: total, outstanding: 0,
      dueDate: dateOffset(mOff * 28 + 10),
      status: 'Paid',
      daysOverdue: 0, discountLabel: null, taxLabel: 'GST 18%',
      createdAt: new Date(Date.now() - (i + 1) * 12 * 864e5).toISOString(),
      customer: { name: cust.name, email: cust.email, address: cust.address },
      lines: [{
        id: `line_0${num}_1`,
        description: `Brightloop CRM — period ${mOff}`,
        qty: seats, unitPrice: up, taxLabel: 'GST 18%', amount: sub,
      }],
      payments: [{
        id: `pay_0${num}_1`,
        invoiceId: `inv_0${num}`,
        invoiceNumber: `INV-0${num}`,
        customerName: cust.name,
        method: ['UPI', 'Bank', 'Card', 'Cash'][i % 4],
        amount: total,
        date: new Date(Date.now() - (i + 1) * 10 * 864e5).toISOString(),
        note: '',
      }],
    };
  }),
];

// ─────────────────────────────────────────────
// PAYMENTS — flat list derived from invoices
// (mutable — recordPayment pushes here)
// ─────────────────────────────────────────────
export const mockPayments = mockInvoices.flatMap((inv) =>
  inv.payments.map((p) => ({ ...p }))
);

// ─────────────────────────────────────────────
// INVOICE COUNTER (for auto-numbering new ones)
// ─────────────────────────────────────────────
export let invoiceCounter = 69; // next will be INV-0070

export function nextInvoiceNumber() {
  invoiceCounter += 1;
  return `INV-${String(invoiceCounter).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────
// WORKED EXAMPLE (kept for dashboard compat)
// ─────────────────────────────────────────────
export const mockWorkedExample = {
  product: { id: 'prd_crm', name: 'Brightloop CRM', basePrice: 2000.0, variant: 'Brand: Odoo', variantPrice: 560.0, unitPrice: 2560.0 },
  plan:    { id: 'pln_monthly', name: 'CRM Monthly', billingPeriod: 'monthly', minQuantity: 1 },
  customer: mockCustomers[0],
  calculation: { quantity: 5, unitPrice: 2560.0, subtotal: 12800.0, discountCode: 'BULK10', discountAmount: 1280.0, taxableAmount: 11520.0, gstRate: 0.18, gstAmount: 2073.6, total: 13593.6 },
  invoice: mockInvoices[0],
};

// ─────────────────────────────────────────────
// 12 MONTH REVENUE (dashboard chart)
// ─────────────────────────────────────────────
export const mock12MonthRevenue = [
  { month: 'Nov 2025', revenue: 420000, newSubscriptions: 12 },
  { month: 'Dec 2025', revenue: 465000, newSubscriptions: 15 },
  { month: 'Jan 2026', revenue: 510000, newSubscriptions: 18 },
  { month: 'Feb 2026', revenue: 540000, newSubscriptions: 14 },
  { month: 'Mar 2026', revenue: 590000, newSubscriptions: 22 },
  { month: 'Apr 2026', revenue: 640000, newSubscriptions: 25 },
  { month: 'May 2026', revenue: 685000, newSubscriptions: 20 },
  { month: 'Jun 2026', revenue: 730000, newSubscriptions: 28 },
  { month: 'Jul 2026', revenue: 790000, newSubscriptions: 31 },
  { month: 'Aug 2026', revenue: 840000, newSubscriptions: 26 },
  { month: 'Sep 2026', revenue: 890000, newSubscriptions: 30 },
  { month: 'Oct 2026', revenue: 955000, newSubscriptions: 35 },
];

import api from './axios';
import {
  mockWorkedExample,
  mockCustomers,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
  mock12MonthRevenue,
  computeStatus,
  computeDaysOverdue,
  nextInvoiceNumber,
} from './mock/db';
import { USE_MOCK } from '../config/env';

/**
 * =====================================================================
 * API CLIENT CONTRACT & RESPONSE SCHEMAS
 * =====================================================================
 *
 * 1. getDashboard(filters)
 *    Request:  { from?, to?, customerId?, status? }
 *    Response: { stats: { activeSubscriptions, revenueCollected, outstanding,
 *                         overdueCount, overdueAmount },
 *                revenueByMonth: [{ month, label, revenue }],
 *                statusBreakdown: [{ status, count }],
 *                overdueInvoices: [{ id, number, customerName, total,
 *                                    outstanding, dueDate, daysOverdue }] }
 *
 * 2. getOverdueInvoices({ page, pageSize, from, to, customerId })
 *    Response: { data, page, pageSize, total }
 *
 * 3. sendReminder(invoiceId)
 *    Response: { ok: boolean }
 *
 * 4. listSubscriptions({ page, pageSize, search, status })
 *    Response: { data: [Subscription], page, pageSize, total }
 *
 * 5. listInvoices({ page, pageSize, status, customerId, from, to,
 *                   search, sortBy, sortDir })
 *    status values: Draft | Confirmed | Paid | Cancelled | Overdue
 *    Overdue is COMPUTED: dueDate < today AND status ∉ {Paid, Cancelled}
 *    Response: { data: [{ id, number, subscriptionId, subscriptionNumber,
 *                          customerId, customerName, periodStart, periodEnd,
 *                          subtotal, discountTotal, taxTotal, total,
 *                          paidAmount, outstanding, dueDate, status,
 *                          daysOverdue }],
 *                page, pageSize, total }
 *
 * 6. getInvoice(id)
 *    Response: same as above + lines, payments, customer, discountLabel,
 *              taxLabel
 *
 * 7. runBilling({ dryRun })
 *    With dryRun=true NOTHING is written.
 *    Response: { dryRun, dueCount, estimatedTotal, alreadyBilledCount,
 *                created: [{ invoiceId, number, customerName, total }],
 *                skippedDuplicates: number,
 *                failed: [{ subscriptionNumber, reason }] }
 *
 *    SQL (backend reference):
 *    BEGIN;
 *      INSERT INTO invoices (subscription_id, period_start, ...) VALUES (...)
 *        ON CONFLICT (subscription_id, period_start) DO NOTHING
 *        RETURNING id;
 *      UPDATE subscriptions SET next_billing_date = next_billing_date + interval
 *        WHERE id = $1;
 *    COMMIT;
 *
 * 8. confirmInvoice(id)   → { ok: true, invoice }
 * 9. cancelInvoice(id)    → { ok: true, invoice }
 * 10. sendInvoice(id)     → { ok: true, invoice }
 *
 * 11. recordPayment({ invoiceId, method, amount, date, note })
 *    Rejects: CANCELLED | OVERPAYMENT | NOT_CONFIRMED | AMOUNT_INVALID
 *    On success updates invoice.paidAmount + status Paid if fully covered.
 *    Response: { ok: true, payment, invoice }
 *
 *    SQL (backend reference):
 *    BEGIN;
 *      INSERT INTO payments (invoice_id, method, amount, date, note)
 *        VALUES ($1,$2,$3,$4,$5) RETURNING *;
 *      UPDATE invoices
 *        SET paid_amount = paid_amount + $3,
 *            outstanding = total - (paid_amount + $3),
 *            status = CASE WHEN (paid_amount + $3) >= total THEN 'Paid'
 *                         ELSE status END
 *        WHERE id = $1
 *        RETURNING *;
 *    COMMIT;
 *
 * 12. listPayments({ page, pageSize, method, from, to, search })
 *    Response: { data: [{ id, invoiceId, invoiceNumber, customerName,
 *                          method, amount, date, note }],
 *                page, pageSize, total }
 *
 * 13. listCustomers({ page, pageSize, search })
 *    Response: { data: [Customer], page, pageSize, total }
 *
 * =====================================================================
 */

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const rand  = (min, max)  => Math.floor(Math.random() * (max - min + 1)) + min;

// Session cache for reminders
const sentRemindersSet = new Set();

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

/** Normalise an invoice for list responses (adds computed status) */
function normaliseInvoice(inv) {
  const status      = computeStatus(inv);
  const daysOverdue = computeDaysOverdue(inv);
  return { ...inv, status, daysOverdue };
}

/** Match a date string against optional from/to bounds (YYYY-MM-DD) */
function inDateRange(dateStr, from, to) {
  if (!dateStr) return true;
  const t = new Date(dateStr).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to   && t > new Date(to).getTime())   return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────
export async function getDashboard(filters = {}) {
  if (USE_MOCK) {
    await sleep(350);
    const { from, to, customerId, status } = filters;

    let filteredInvoices = mockInvoices.map(normaliseInvoice);

    if (customerId) {
      filteredInvoices = filteredInvoices.filter((i) => i.customerId === customerId);
    }
    if (status) {
      filteredInvoices = filteredInvoices.filter(
        (i) => i.status.toLowerCase() === status.toLowerCase()
      );
    }
    if (from) {
      filteredInvoices = filteredInvoices.filter((i) =>
        inDateRange(i.createdAt || i.dueDate, from, null)
      );
    }
    if (to) {
      filteredInvoices = filteredInvoices.filter((i) =>
        inDateRange(i.createdAt || i.dueDate, null, to)
      );
    }

    let filteredSubs = [...mockSubscriptions];
    if (customerId) filteredSubs = filteredSubs.filter((s) => s.customerId === customerId);

    const activeSubscriptions = filteredSubs.filter((s) => s.status === 'Active').length;
    const revenueCollected    = filteredInvoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
    const outstanding         = filteredInvoices.filter((i) => ['Confirmed', 'Overdue', 'Draft'].includes(i.status)).reduce((s, i) => s + i.outstanding, 0);
    const overdueList         = filteredInvoices.filter((i) => i.status === 'Overdue');
    const overdueCount        = overdueList.length;
    const overdueAmount       = overdueList.reduce((s, i) => s + i.outstanding, 0);

    const statusCounts = { Paid: 0, Confirmed: 0, Draft: 0, Overdue: 0, Cancelled: 0 };
    filteredInvoices.forEach((inv) => {
      if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    });

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const revenueByMonth = mock12MonthRevenue.map((item, idx) => ({
      month: `2026-${String((idx % 12) + 1).padStart(2, '0')}`,
      label: item.month.split(' ')[0],
      revenue: Math.round(item.revenue * (customerId ? 0.15 : 1)),
    }));

    const overdueInvoices = overdueList.map((inv) => ({
      id: inv.id,
      number: inv.number || inv.invoiceNumber,
      customerName: inv.customerName,
      total: inv.total,
      outstanding: inv.outstanding,
      dueDate: inv.dueDate,
      daysOverdue: inv.daysOverdue,
      isReminderSent: sentRemindersSet.has(inv.id),
    }));

    return { stats: { activeSubscriptions, revenueCollected, outstanding, overdueCount, overdueAmount }, revenueByMonth, statusBreakdown, overdueInvoices };
  }

  const { data } = await api.get('/dashboard', { params: filters });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// OVERDUE INVOICES
// ─────────────────────────────────────────────────────────────────────
export async function getOverdueInvoices({ page = 1, pageSize = 5, from, to, customerId } = {}) {
  if (USE_MOCK) {
    await sleep(300);
    const dashboardData = await getDashboard({ from, to, customerId });
    const list          = dashboardData.overdueInvoices;
    const total         = list.length;
    const paginated     = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }
  const { data } = await api.get('/invoices/overdue', { params: { page, pageSize, from, to, customerId } });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// SEND REMINDER
// ─────────────────────────────────────────────────────────────────────
export async function sendReminder(invoiceId) {
  if (USE_MOCK) {
    await sleep(400);
    sentRemindersSet.add(invoiceId);
    return { ok: true };
  }
  const { data } = await api.post(`/invoices/${invoiceId}/reminder`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────
export async function listSubscriptions({ page = 1, pageSize = 10, search = '', status = '' } = {}) {
  if (USE_MOCK) {
    await sleep(350);
    let list = [...mockSubscriptions];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.subscriptionNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)
      );
    }
    if (status) list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());

    const total     = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }
  const { data } = await api.get('/subscriptions', { params: { page, pageSize, search, status } });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// INVOICES — LIST
// ─────────────────────────────────────────────────────────────────────
export async function listInvoices({
  page = 1, pageSize = 10, status = '', customerId = '',
  from = '', to = '', search = '', sortBy = '', sortDir = 'asc',
} = {}) {
  if (USE_MOCK) {
    await sleep(rand(300, 500));

    let list = mockInvoices.map(normaliseInvoice);

    // Search: invoice number OR customer name
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.number || i.invoiceNumber || '').toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      );
    }

    // Status filter — Overdue is computed
    if (status) {
      list = list.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }

    // Customer filter
    if (customerId) {
      list = list.filter((i) => i.customerId === customerId);
    }

    // Date range on dueDate
    if (from) list = list.filter((i) => inDateRange(i.dueDate, from, null));
    if (to)   list = list.filter((i) => inDateRange(i.dueDate, null, to));

    // Sorting
    if (sortBy) {
      list.sort((a, b) => {
        let av = a[sortBy], bv = b[sortBy];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total     = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);

    return { data: paginated, page, pageSize, total };
  }

  const { data } = await api.get('/invoices', {
    params: { page, pageSize, status, customerId, from, to, search, sortBy, sortDir },
  });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// INVOICES — GET ONE
// ─────────────────────────────────────────────────────────────────────
export async function getInvoice(id) {
  if (USE_MOCK) {
    await sleep(300);
    const inv = mockInvoices.find(
      (i) => i.id === id || i.number === id || i.invoiceNumber === id
    );
    if (!inv) return null;
    return normaliseInvoice(inv);
  }
  const { data } = await api.get(`/invoices/${id}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// RUN BILLING
//
// SQL (backend, for reference):
//   BEGIN;
//     INSERT INTO invoices (subscription_id, period_start, period_end, ...)
//       VALUES (...)
//       ON CONFLICT (subscription_id, period_start) DO NOTHING
//       RETURNING id;
//     UPDATE subscriptions
//       SET next_billing_date = next_billing_date + INTERVAL '1 month'
//       WHERE id = $subId;
//   COMMIT;
// ─────────────────────────────────────────────────────────────────────
export async function runBilling({ dryRun = true } = {}) {
  if (USE_MOCK) {
    await sleep(rand(500, 900));

    const todayStr = new Date().toISOString().split('T')[0];

    // Find Active subscriptions whose nextBillingDate <= today
    const dueSubs = mockSubscriptions.filter(
      (s) => s.status === 'Active' && s.nextBillingDate <= todayStr
    );

    const created          = [];
    const failed           = [];
    let   skippedDuplicates = 0;

    for (const sub of dueSubs) {
      // Compute period: from nextBillingDate to +period days
      const periodStart = sub.nextBillingDate;
      const periodEndDate = new Date(periodStart);
      const days = sub.billingPeriod === 'quarterly' ? 90 : 30;
      periodEndDate.setDate(periodEndDate.getDate() + days - 1);
      const periodEnd = periodEndDate.toISOString().split('T')[0];

      // Enforce UNIQUE(subscriptionId, periodStart)
      const exists = mockInvoices.find(
        (i) => i.subscriptionId === sub.id && i.periodStart === periodStart
      );
      if (exists) {
        skippedDuplicates++;
        continue;
      }

      // Invoice math
      const subtotal     = +(sub.seats * sub.unitPrice).toFixed(2);
      const discountAmt  = +(subtotal * (sub.discountRate || 0)).toFixed(2);
      const taxable      = +(subtotal - discountAmt).toFixed(2);
      const taxAmt       = +(taxable * (sub.taxRate || 0.18)).toFixed(2);
      const total        = +(taxable + taxAmt).toFixed(2);

      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + 15);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      if (!dryRun) {
        const invNumber = nextInvoiceNumber();
        const invId     = `inv_rb_${Date.now()}_${sub.id}`;
        const cust      = mockCustomers.find((c) => c.id === sub.customerId) || {};

        const newInv = {
          id:                 invId,
          number:             invNumber,
          invoiceNumber:      invNumber,
          subscriptionId:     sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          customerId:         sub.customerId,
          customerName:       sub.customerName,
          periodStart,
          periodEnd,
          subtotal,
          discountTotal:      discountAmt,
          taxTotal:           taxAmt,
          total,
          paidAmount:         0,
          outstanding:        total,
          dueDate:            dueDateStr,
          status:             'Confirmed',
          daysOverdue:        0,
          discountLabel:      sub.discountCode ? `${sub.discountCode} (${Math.round((sub.discountRate || 0) * 100)}%)` : null,
          taxLabel:           sub.taxLabel || 'GST 18%',
          createdAt:          new Date().toISOString(),
          customer: { name: sub.customerName, email: cust.email || '', address: cust.address || '' },
          lines: [{
            id:          `${invId}_l1`,
            description: `${sub.planName} — ${periodStart} to ${periodEnd}`,
            qty:         sub.seats,
            unitPrice:   sub.unitPrice,
            taxLabel:    sub.taxLabel || 'GST 18%',
            amount:      subtotal,
          }],
          payments: [],
        };

        mockInvoices.push(newInv);

        // Advance nextBillingDate
        const nextDate = new Date(sub.nextBillingDate);
        nextDate.setDate(nextDate.getDate() + days);
        sub.nextBillingDate = nextDate.toISOString().split('T')[0];

        created.push({
          invoiceId:    invId,
          number:       invNumber,
          customerName: sub.customerName,
          total,
        });
      } else {
        // dryRun — just report what would be created
        created.push({
          invoiceId:    null,
          number:       null,
          customerName: sub.customerName,
          total,
        });
      }
    }

    const dueCount       = dueSubs.length;
    const estimatedTotal = created.reduce((s, c) => s + c.total, 0) +
      (dryRun ? 0 : 0); // already summed above

    // Re-compute alreadyBilledCount for dryRun (subs that are due but already billed)
    const alreadyBilledCount = dryRun
      ? dueSubs.filter((sub) => {
          const periodStart = sub.nextBillingDate;
          return mockInvoices.some(
            (i) => i.subscriptionId === sub.id && i.periodStart === periodStart
          );
        }).length
      : skippedDuplicates;

    return {
      dryRun,
      dueCount,
      estimatedTotal: dryRun
        ? dueSubs.reduce((s, sub) => {
            const subtotal    = +(sub.seats * sub.unitPrice).toFixed(2);
            const discountAmt = +(subtotal * (sub.discountRate || 0)).toFixed(2);
            const taxable     = +(subtotal - discountAmt).toFixed(2);
            const taxAmt      = +(taxable * (sub.taxRate || 0.18)).toFixed(2);
            return s + +(taxable + taxAmt).toFixed(2);
          }, 0)
        : estimatedTotal,
      alreadyBilledCount,
      created: dryRun ? [] : created,
      skippedDuplicates: dryRun ? alreadyBilledCount : skippedDuplicates,
      failed,
    };
  }

  const { data } = await api.post('/billing/run', { dryRun });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// INVOICE ACTIONS
// ─────────────────────────────────────────────────────────────────────
export async function confirmInvoice(id) {
  if (USE_MOCK) {
    await sleep(400);
    const inv = mockInvoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    if (inv.status !== 'Draft')
      throw Object.assign(new Error('Only Draft invoices can be confirmed'), { code: 'INVALID_TRANSITION' });
    inv.status = 'Confirmed';
    return { ok: true, invoice: normaliseInvoice(inv) };
  }
  const { data } = await api.post(`/invoices/${id}/confirm`);
  return data;
}

export async function cancelInvoice(id) {
  if (USE_MOCK) {
    await sleep(400);
    const inv = mockInvoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    if (!['Draft', 'Confirmed'].includes(inv.status))
      throw Object.assign(new Error(`Cannot cancel a ${inv.status} invoice`), { code: 'INVALID_TRANSITION' });
    inv.status = 'Cancelled';
    inv.outstanding = 0;
    return { ok: true, invoice: normaliseInvoice(inv) };
  }
  const { data } = await api.post(`/invoices/${id}/cancel`);
  return data;
}

export async function sendInvoice(id) {
  if (USE_MOCK) {
    await sleep(600);
    const inv = mockInvoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    return { ok: true, invoice: normaliseInvoice(inv) };
  }
  const { data } = await api.post(`/invoices/${id}/send`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// RECORD PAYMENT
//
// SQL (backend, for reference):
//   BEGIN;
//     INSERT INTO payments (invoice_id, method, amount, date, note)
//       VALUES ($1,$2,$3,$4,$5) RETURNING *;
//     UPDATE invoices
//       SET paid_amount = paid_amount + $3,
//           outstanding = total - (paid_amount + $3),
//           status = CASE WHEN (paid_amount + $3) >= total THEN 'Paid'
//                        ELSE status END
//       WHERE id = $1 RETURNING *;
//   COMMIT;
// ─────────────────────────────────────────────────────────────────────
export async function recordPayment({ invoiceId, method, amount, date, note = '' }) {
  if (USE_MOCK) {
    await sleep(rand(400, 600));

    const inv = mockInvoices.find((i) => i.id === invoiceId);
    if (!inv) throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND' });

    if (inv.status === 'Cancelled')
      throw Object.assign(new Error("Can't record a payment on a cancelled invoice"), { code: 'CANCELLED' });

    if (inv.status === 'Draft')
      throw Object.assign(new Error('Invoice must be confirmed before accepting payments'), { code: 'NOT_CONFIRMED' });

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0)
      throw Object.assign(new Error('Amount must be greater than 0'), { code: 'AMOUNT_INVALID' });

    const outstanding = +(inv.total - inv.paidAmount).toFixed(2);
    if (numAmount > outstanding + 0.001)
      throw Object.assign(new Error('Payment exceeds the outstanding amount'), { code: 'OVERPAYMENT' });

    const payment = {
      id:            `pay_${Date.now()}`,
      invoiceId,
      invoiceNumber: inv.number || inv.invoiceNumber,
      customerName:  inv.customerName,
      method,
      amount:        numAmount,
      date:          date || new Date().toISOString(),
      note:          note || '',
    };

    inv.payments  = [...(inv.payments || []), payment];
    inv.paidAmount = +((inv.paidAmount || 0) + numAmount).toFixed(2);
    inv.outstanding = +(inv.total - inv.paidAmount).toFixed(2);

    if (inv.paidAmount >= inv.total - 0.001) {
      inv.status      = 'Paid';
      inv.outstanding = 0;
    }

    // Sync global payments list
    mockPayments.push(payment);

    return { ok: true, payment, invoice: normaliseInvoice(inv) };
  }

  const { data } = await api.post('/payments', { invoiceId, method, amount, date, note });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// PAYMENTS — LIST
// ─────────────────────────────────────────────────────────────────────
export async function listPayments({
  page = 1, pageSize = 10, method = '', from = '', to = '', search = '',
} = {}) {
  if (USE_MOCK) {
    await sleep(rand(300, 500));

    let list = [...mockPayments];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.invoiceNumber || '').toLowerCase().includes(q) ||
          (p.customerName  || '').toLowerCase().includes(q) ||
          (p.note          || '').toLowerCase().includes(q)
      );
    }

    if (method) list = list.filter((p) => p.method.toLowerCase() === method.toLowerCase());
    if (from)   list = list.filter((p) => inDateRange(p.date, from, null));
    if (to)     list = list.filter((p) => inDateRange(p.date, null, to));

    // Sort newest first
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total     = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);

    return { data: paginated, page, pageSize, total };
  }

  const { data } = await api.get('/payments', { params: { page, pageSize, method, from, to, search } });
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────
export async function listCustomers({ page = 1, pageSize = 100, search = '' } = {}) {
  if (USE_MOCK) {
    await sleep(250);
    let list = [...mockCustomers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }
    const total     = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }
  const { data } = await api.get('/customers', { params: { page, pageSize, search } });
  return data;
}

/** List Confirmed invoices with outstanding > 0 (for payment invoice picker) */
export async function listOpenInvoices({ search = '' } = {}) {
  if (USE_MOCK) {
    await sleep(250);
    let list = mockInvoices.map(normaliseInvoice).filter(
      (i) => (i.status === 'Confirmed' || i.status === 'Overdue') && i.outstanding > 0
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.number || i.invoiceNumber || '').toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      );
    }
    return { data: list };
  }
  const { data } = await api.get('/invoices/open', { params: { search } });
  return data;
}

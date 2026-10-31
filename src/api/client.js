import api from './axios';
import {
  mockWorkedExample,
  mockCustomers,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
  mock12MonthRevenue,
  mockProducts,
  mockPlans,
  mockDiscounts,
  mockTaxes,
  computeAllowedActions,
  computeStatus,
  computeDaysOverdue,
  nextInvoiceNumber,
} from './mock/db';
import { isReal, isRealWrite } from '../config/env';
import {
  adaptError,
  adaptPortalSummary,
  adaptPortalSubscription,
  adaptAdminSubscription,
  adaptPricePreview,
  adaptBillingRun,
  adaptInvoice,
  adaptPayment,
} from './adapters';

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
 *    Response: { ok: boolean, message?: string }
 *
 * 4. listSubscriptions({ page, pageSize, search, status, plan, customer })
 *    Response: { data: [Subscription], page, pageSize, total }
 *
 * 5. getSubscription(id)
 *    Response: { ...subscription, customer, plan, lines, invoices, allowedActions, summary }
 *
 * 6. createSubscription(payload)
 *    Request:  { customerId, planId, startDate, expiryDate, paymentTerms, lines }
 *    Response: { ok: true, subscription }
 *
 * 7. transitionSubscription(id, action) / updateSubscriptionStatus(id, action)
 *    Request:  action: 'quote'|'confirm'|'activate'|'pause'|'resume'|'renew'|'close'
 *    Response: { ok: true, message, subscription }
 *
 * 8. previewSubscriptionPrice({ lines })
 *    Request:  { lines: [{ productId, variantId, qty }] }
 *    Response: { lines, subtotal, discountTotal, discountLabel, taxTotal, total }
 *
 * 9. listInvoices({ page, pageSize, status, customerId, from, to, search, sortBy, sortDir })
 *    Response: { data: [Invoice], page, pageSize, total }
 *
 * 10. getInvoice(id)
 *     Response: { ...invoice, lines, payments, customer, discountLabel, taxLabel }
 *
 * 11. runBilling({ dryRun })
 *     Response: { dryRun, dueCount, estimatedTotal, alreadyBilledCount, created, skippedDuplicates, failed }
 *
 * 12. confirmInvoice(id)   → { ok: true, invoice }
 * 13. cancelInvoice(id)    → { ok: true, invoice }
 * 14. sendInvoice(id)      → { ok: true } (stub)
 * 15. recordPayment(body)  → { ok: true, payment, invoice }
 * 16. listPayments(params) → { data: [Payment], page, pageSize, total }
 * 17. listCustomers(params)→ { data: [Customer], page, pageSize, total }
 * 18. listOpenInvoices()   → { data: [Invoice] }
 * 19. getCatalog()         → { customers, plans, products, taxes, discounts }
 * 20. Portal (customer scoped by JWT):
 *     getMyPortalSummary()   → { customerName, outstandingTotal, overdueCount, overdueTotal, nextPayment, activeSubscriptions }
 *     listMySubscriptions()  → { data: [Subscription], total }
 *     getMySubscription(id)  → { ...subscription, lines, summary, invoices }
 *     listMyInvoices(params) → { data: [Invoice], page, pageSize, total }
 *     getMyInvoice(id)       → { ...invoice }
 * =====================================================================
 */

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Session cache for reminders in mock mode
const sentRemindersSet = new Set();

/** Normalise an invoice for list responses (adds computed status) */
function normaliseInvoice(inv) {
  const status = computeStatus(inv);
  const daysOverdue = computeDaysOverdue(inv);
  return { ...inv, status, daysOverdue };
}

/** Match a date string against optional from/to bounds (YYYY-MM-DD) */
function inDateRange(dateStr, from, to) {
  if (!dateStr) return true;
  const t = new Date(dateStr).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// 1. DASHBOARD & OVERDUE
// ─────────────────────────────────────────────────────────────────────
export async function getDashboard(filters = {}) {
  if (!isReal('dashboard')) {
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
    const revenueCollected = filteredInvoices
      .filter((i) => i.status === 'Paid')
      .reduce((s, i) => s + i.total, 0);
    const outstanding = filteredInvoices
      .filter((i) => ['Confirmed', 'Overdue', 'Draft'].includes(i.status))
      .reduce((s, i) => s + i.outstanding, 0);
    const overdueList = filteredInvoices.filter((i) => i.status === 'Overdue');
    const overdueCount = overdueList.length;
    const overdueAmount = overdueList.reduce((s, i) => s + i.outstanding, 0);

    const statusCounts = { Paid: 0, Confirmed: 0, Draft: 0, Overdue: 0, Cancelled: 0 };
    filteredInvoices.forEach((inv) => {
      if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    });

    const statusBreakdown = Object.entries(statusCounts).map(([st, count]) => ({
      status: st,
      count,
    }));

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

    return {
      stats: {
        activeSubscriptions,
        revenue: revenueCollected,
        revenueCollected,
        outstanding,
        overdueCount,
        overdueAmount,
      },
      revenueByMonth,
      statusBreakdown,
      overdueInvoices,
    };
  }

  try {
    const { data } = await api.get('/dashboard', { params: filters });
    if (data?.stats && data.stats.revenueCollected === undefined) {
      data.stats.revenueCollected = data.stats.revenue || 0;
    }
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getOverdueInvoices({ page = 1, pageSize = 5, from, to, customerId } = {}) {
  if (!isReal('dashboard') && !isReal('invoices')) {
    await sleep(300);
    const dashboardData = await getDashboard({ from, to, customerId });
    const list = dashboardData.overdueInvoices;
    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }

  try {
    const { data } = await api.get('/invoices/overdue', {
      params: { page, pageSize, from, to, customerId },
    });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function sendReminder(invoiceId) {
  if (!isReal('invoices') && !isReal('dashboard')) {
    await sleep(400);
    sentRemindersSet.add(invoiceId);
    return { ok: true, success: true, message: 'Payment reminder sent' };
  }

  try {
    const { data } = await api.post(`/invoices/${invoiceId}/reminder`);
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getReportsSummary(filters = {}) {
  if (!isReal('reports') && !isReal('dashboard')) {
    return getDashboard(filters);
  }

  try {
    const { data } = await api.get('/reports/summary', { params: filters });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 2. SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────
export async function listSubscriptions({
  page = 1,
  pageSize = 10,
  search = '',
  status = '',
  plan = '',
  customer = '',
} = {}) {
  if (!isReal('subscriptions')) {
    await sleep(350);
    let list = [...mockSubscriptions];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.subscriptionNumber || '').toLowerCase().includes(q) ||
          (s.customerName || '').toLowerCase().includes(q)
      );
    }
    if (status) list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    if (plan)
      list = list.filter(
        (s) => s.planId === plan || (s.planName || '').toLowerCase() === plan.toLowerCase()
      );
    if (customer)
      list = list.filter(
        (s) =>
          s.customerId === customer ||
          (s.customerName || '').toLowerCase().includes(customer.toLowerCase())
      );

    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }

  try {
    const { data } = await api.get('/subscriptions', {
      params: { page, pageSize, search, status, plan, customer },
    });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getSubscription(id) {
  if (!isReal('subscriptions')) {
    await sleep(300);
    const sub = mockSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id);
    if (!sub) return null;

    const customer = mockCustomers.find((c) => c.id === sub.customerId) || {
      id: sub.customerId,
      name: sub.customerName,
      email: 'billing@customer.com',
      phone: '+91 98765 43210',
      address: 'Business Park, Mumbai',
    };
    const plan = mockPlans.find((p) => p.id === sub.planId) || {
      id: sub.planId,
      name: sub.planName || 'CRM Monthly',
      price: sub.unitPrice || 2560,
      period: sub.billingPeriod || 'monthly',
      minQty: 1,
      pausable: true,
      closable: true,
      renewable: true,
    };

    const lines = sub.lines || [
      {
        id: `${sub.id}_l1`,
        productId: 'prd_crm',
        productName: 'Brightloop CRM',
        variantId: 'var_odoo',
        variantLabel: 'Brand: Odoo',
        qty: sub.seats || 5,
        unitPrice: sub.unitPrice || 2560,
        taxRate: 18,
        amount: (sub.seats || 5) * (sub.unitPrice || 2560),
      },
    ];

    const subInvoices = mockInvoices
      .filter((i) => i.subscriptionId === sub.id)
      .map(normaliseInvoice);

    const allowedActions = computeAllowedActions(sub.status, plan);

    return adaptAdminSubscription({
      ...sub,
      customer,
      plan,
      lines,
      invoices: subInvoices,
      allowedActions,
      notes: sub.notes || 'Standard recurring contract. Auto-invoicing enabled.',
    });
  }

  try {
    const { data } = await api.get(`/subscriptions/${id}`);
    return adaptAdminSubscription(data);
  } catch (err) {
    throw adaptError(err);
  }
}

export async function createSubscription(payload) {
  if (!isReal('subscriptions')) {
    await sleep(400);
    const subId = `sub_${Date.now()}`;
    const nextNum = mockSubscriptions.length + 1;
    const subNumber = `SUB-${String(nextNum).padStart(4, '0')}`;
    const customer = mockCustomers.find((c) => c.id === payload.customerId) || {
      name: 'Acme Traders',
    };
    const plan = mockPlans.find((p) => p.id === payload.planId) || {
      name: 'CRM Monthly',
      period: 'monthly',
    };

    const rawLines = payload.lines || [];
    let subtotal = 0;
    let totalSeats = 0;
    const lines = rawLines.map((l, idx) => {
      const prod = mockProducts.find((p) => p.id === l.productId);
      const variant = prod?.variants?.find((v) => v.id === l.variantId);
      const unitPrice = (prod?.salesPrice || 2000) + (variant?.extraPrice || 0);
      const qty = parseInt(l.qty || 1, 10);
      const amount = unitPrice * qty;
      subtotal += amount;
      totalSeats += qty;
      return {
        id: `${subId}_l${idx + 1}`,
        productId: l.productId,
        productName: prod?.name || 'Brightloop CRM',
        variantId: l.variantId,
        variantLabel: variant ? `${variant.attribute}: ${variant.value}` : null,
        qty,
        unitPrice,
        taxRate: 18,
        amount,
      };
    });

    const isBulk = totalSeats >= 5;
    const discountAmt = isBulk ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const taxable = subtotal - discountAmt;
    const taxAmt = Math.round(taxable * 0.18 * 100) / 100;
    const total = taxable + taxAmt;

    const newSub = {
      id: subId,
      subscriptionNumber: subNumber,
      number: subNumber,
      customerId: payload.customerId,
      customerName: customer.name,
      planId: payload.planId,
      planName: plan.name,
      billingPeriod: plan.period || 'monthly',
      seats: totalSeats,
      unitPrice: lines[0]?.unitPrice || 2560,
      discountCode: isBulk ? 'BULK10' : null,
      discountRate: isBulk ? 0.1 : 0,
      taxLabel: 'GST 18%',
      taxRate: 0.18,
      status: payload.status || 'Draft',
      startDate: payload.startDate || new Date().toISOString().split('T')[0],
      expiryDate: payload.expiryDate || null,
      paymentTerms: payload.paymentTerms || 'Net 15',
      nextBillingDate:
        payload.status === 'Active'
          ? payload.startDate || new Date().toISOString().split('T')[0]
          : null,
      createdAt: new Date().toISOString(),
      lines,
      amount: total,
    };

    mockSubscriptions.unshift(newSub);
    return { ok: true, subscription: newSub };
  }

  try {
    const body = {
      customerId: payload.customerId,
      planId: payload.planId,
      startDate: payload.startDate,
      expiryDate: payload.expiryDate || null,
      paymentTerms: payload.paymentTerms || 'Net 15',
      lines: (payload.lines || []).map((l) => ({
        productId: l.productId,
        variantId: l.variantId || null,
        qty: parseInt(l.qty || 1, 10),
      })),
    };

    const { data } = await api.post('/subscriptions', body);
    const sub = data.subscription || data;

    // If UI requested status Quotation, trigger status update right after creation
    if (payload.status === 'Quotation' && sub?.id) {
      try {
        await api.patch(`/subscriptions/${sub.id}/status`, { action: 'quote' });
        sub.status = 'Quotation';
      } catch (quoteErr) {
        console.warn('Could not auto-transition to Quotation:', quoteErr);
      }
    }

    return {
      ok: true,
      subscription: {
        ...sub,
        subscriptionNumber: sub.number || `SUB-${sub.id}`,
      },
    };
  } catch (err) {
    throw adaptError(err);
  }
}

/** Transition a subscription (quote, confirm, activate, pause, resume, renew, close) */
export async function transitionSubscription(id, action) {
  const normAction = (action || '').toLowerCase();

  // The UI action "cancel" is NOT supported by the backend: reject gracefully
  // TODO: Add support for canceling active/draft subscriptions in backend transition table
  if (normAction === 'cancel') {
    const notSupportedErr = new Error("Cancel isn't available yet");
    notSupportedErr.code = 'NOT_SUPPORTED';
    throw notSupportedErr;
  }

  if (!isReal('subscriptions')) {
    await sleep(350);
    const sub = mockSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id);
    if (!sub) throw new Error('Subscription not found');

    const plan = mockPlans.find((p) => p.id === sub.planId) || {};
    const allowed = computeAllowedActions(sub.status, plan);
    if (!allowed.includes(normAction)) {
      const err = new Error(`Cannot perform '${action}' on subscription in '${sub.status}' state`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }

    switch (normAction) {
      case 'quote':
        sub.status = 'Quotation';
        break;
      case 'confirm':
        sub.status = 'Confirmed';
        break;
      case 'activate':
        sub.status = 'Active';
        sub.nextBillingDate =
          sub.nextBillingDate || sub.startDate || new Date().toISOString().split('T')[0];
        break;
      case 'pause':
        sub.status = 'Paused';
        break;
      case 'resume':
        sub.status = 'Active';
        break;
      case 'close':
        sub.status = 'Closed';
        break;
      case 'renew':
        sub.status = 'Active';
        sub.nextBillingDate = new Date().toISOString().split('T')[0];
        break;
      default:
        break;
    }

    return { ok: true, message: `Subscription status updated to ${sub.status}`, subscription: sub };
  }

  try {
    const { data } = await api.patch(`/subscriptions/${id}/status`, { action: normAction });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export const updateSubscriptionStatus = transitionSubscription;

export async function previewSubscriptionPrice({ lines = [] } = {}) {
  if (!isReal('subscriptions')) {
    await sleep(200);
    let subtotal = 0;
    let totalQty = 0;

    for (const l of lines) {
      const prod = mockProducts.find((p) => p.id === l.productId);
      const basePrice = prod ? prod.salesPrice : 2000;
      const variant = prod?.variants?.find((v) => v.id === l.variantId);
      const extraPrice = variant ? variant.extraPrice : 0;
      const unitPrice = basePrice + extraPrice;
      const lineQty = Math.max(1, parseInt(l.qty || 1, 10));
      subtotal += unitPrice * lineQty;
      totalQty += lineQty;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    let discountAmount = 0;
    let discountCode = null;

    if (totalQty >= 5) {
      discountCode = 'BULK10';
      discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
    }

    const taxable = Math.round((subtotal - discountAmount) * 100) / 100;
    const tax = Math.round(taxable * 0.18 * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    return {
      lines,
      subtotal,
      discount: discountAmount,
      discountTotal: discountAmount,
      discountCode,
      discountLabel: discountCode ? `${discountCode}` : null,
      taxable,
      tax,
      taxTotal: tax,
      total,
    };
  }

  try {
    const reqLines = (lines || []).map((l) => ({
      productId: l.productId,
      variantId: l.variantId || null,
      qty: parseInt(l.qty || 1, 10),
    }));

    const { data } = await api.post('/subscriptions/price-preview', { lines: reqLines });
    return adaptPricePreview(data, lines);
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 3. INVOICES
// ─────────────────────────────────────────────────────────────────────
export async function listInvoices({
  page = 1,
  pageSize = 10,
  status = '',
  customerId = '',
  from = '',
  to = '',
  search = '',
  sortBy = '',
  sortDir = 'asc',
} = {}) {
  if (!isReal('invoices')) {
    await sleep(rand(300, 500));
    let list = mockInvoices.map(normaliseInvoice);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.number || i.invoiceNumber || '').toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      );
    }

    if (status) {
      list = list.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }

    if (customerId) {
      list = list.filter((i) => i.customerId === customerId);
    }

    if (from) list = list.filter((i) => inDateRange(i.dueDate, from, null));
    if (to) list = list.filter((i) => inDateRange(i.dueDate, null, to));

    if (sortBy) {
      list.sort((a, b) => {
        let av = a[sortBy];
        let bv = b[sortBy];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }

  try {
    const { data } = await api.get('/invoices', {
      params: { page, pageSize, status, customerId, from, to, search, sortBy, sortDir },
    });
    return {
      ...data,
      data: (data?.data || []).map(adaptInvoice),
    };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getInvoice(id) {
  if (!isReal('invoices')) {
    await sleep(300);
    const inv = mockInvoices.find((i) => i.id === id || i.number === id || i.invoiceNumber === id);
    if (!inv) return null;
    return adaptInvoice(normaliseInvoice(inv));
  }

  try {
    const { data } = await api.get(`/invoices/${id}`);
    return adaptInvoice(data);
  } catch (err) {
    throw adaptError(err);
  }
}

export async function confirmInvoice(id) {
  if (!isReal('invoices')) {
    await sleep(400);
    const inv = mockInvoices.find((i) => i.id === id);
    if (!inv) throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND' });
    if (inv.status !== 'Draft') {
      const err = new Error('Only Draft invoices can be confirmed');
      err.code = 'NOT_CONFIRMED';
      throw err;
    }
    inv.status = 'Confirmed';
    return { ok: true, invoice: adaptInvoice(normaliseInvoice(inv)) };
  }

  try {
    const { data } = await api.post(`/invoices/${id}/confirm`);
    return { ok: true, invoice: adaptInvoice(data.invoice || data) };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function cancelInvoice(id) {
  if (!isReal('invoices')) {
    await sleep(400);
    const inv = mockInvoices.find((i) => i.id === id);
    if (!inv) throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND' });
    if (!['Draft', 'Confirmed'].includes(inv.status)) {
      const err = new Error(`Cannot cancel a ${inv.status} invoice`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
    inv.status = 'Cancelled';
    inv.outstanding = 0;
    return { ok: true, invoice: adaptInvoice(normaliseInvoice(inv)) };
  }

  try {
    const { data } = await api.post(`/invoices/${id}/cancel`);
    return { ok: true, invoice: adaptInvoice(data.invoice || data) };
  } catch (err) {
    throw adaptError(err);
  }
}

/** Send Invoice email stub (no backend email route) */
export async function sendInvoice(id) {
  console.warn(`[Brightloop] sendInvoice called for invoice ${id}: using local dispatch stub.`);
  await sleep(400);
  return { ok: true, message: 'Invoice dispatched to customer email' };
}

/** List Confirmed invoices with outstanding > 0 for payment picker */
export async function listOpenInvoices({ search = '' } = {}) {
  if (!isReal('invoices')) {
    await sleep(250);
    let list = mockInvoices
      .map(normaliseInvoice)
      .filter((i) => (i.status === 'Confirmed' || i.status === 'Overdue') && i.outstanding > 0);
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

  try {
    const { data } = await api.get('/invoices', {
      params: { status: 'Confirmed', search, pageSize: 50 },
    });
    const items = (data?.data || [])
      .map(adaptInvoice)
      .filter((i) => i.outstanding > 0);
    return { data: items };
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. BILLING ENGINE
// ─────────────────────────────────────────────────────────────────────
export async function runBilling({ dryRun = true } = {}) {
  if (!isReal('billing')) {
    await sleep(rand(500, 900));
    const todayStr = new Date().toISOString().split('T')[0];
    const dueSubs = mockSubscriptions.filter(
      (s) => s.status === 'Active' && s.nextBillingDate <= todayStr
    );

    const created = [];
    const failed = [];
    let skippedDuplicates = 0;

    for (const sub of dueSubs) {
      const periodStart = sub.nextBillingDate;
      const periodEndDate = new Date(periodStart);
      const days = sub.billingPeriod === 'quarterly' ? 90 : 30;
      periodEndDate.setDate(periodEndDate.getDate() + days - 1);
      const periodEnd = periodEndDate.toISOString().split('T')[0];

      const exists = mockInvoices.find(
        (i) => i.subscriptionId === sub.id && i.periodStart === periodStart
      );
      if (exists) {
        skippedDuplicates++;
        continue;
      }

      const subtotal = +(sub.seats * sub.unitPrice).toFixed(2);
      const discountAmt = +(subtotal * (sub.discountRate || 0)).toFixed(2);
      const taxable = +(subtotal - discountAmt).toFixed(2);
      const taxAmt = +(taxable * (sub.taxRate || 0.18)).toFixed(2);
      const total = +(taxable + taxAmt).toFixed(2);

      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + 15);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      if (!dryRun) {
        const invNumber = nextInvoiceNumber();
        const invId = `inv_rb_${Date.now()}_${sub.id}`;
        const cust = mockCustomers.find((c) => c.id === sub.customerId) || {};

        const newInv = {
          id: invId,
          number: invNumber,
          invoiceNumber: invNumber,
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          customerId: sub.customerId,
          customerName: sub.customerName,
          periodStart,
          periodEnd,
          subtotal,
          discountTotal: discountAmt,
          taxTotal: taxAmt,
          total,
          paidAmount: 0,
          outstanding: total,
          dueDate: dueDateStr,
          status: 'Confirmed',
          daysOverdue: 0,
          createdAt: new Date().toISOString(),
          customer: { name: sub.customerName, email: cust.email || '', address: cust.address || '' },
          lines: [
            {
              id: `${invId}_l1`,
              description: `${sub.planName} — ${periodStart} to ${periodEnd}`,
              qty: sub.seats,
              unitPrice: sub.unitPrice,
              taxLabel: 'GST 18%',
              amount: subtotal,
            },
          ],
          payments: [],
        };

        mockInvoices.push(newInv);

        const nextDate = new Date(sub.nextBillingDate);
        nextDate.setDate(nextDate.getDate() + days);
        sub.nextBillingDate = nextDate.toISOString().split('T')[0];

        created.push({
          invoiceId: invId,
          number: invNumber,
          customerName: sub.customerName,
          total,
        });
      } else {
        created.push({
          invoiceId: null,
          number: null,
          customerName: sub.customerName,
          total,
        });
      }
    }

    const dueCount = dueSubs.length;
    const estimatedTotal = created.reduce((s, c) => s + c.total, 0);

    return adaptBillingRun({
      dryRun,
      dueCount,
      estimatedTotal,
      alreadyBilledCount: skippedDuplicates,
      skippedDuplicates,
      created: dryRun ? [] : created,
      failed,
    });
  }

  try {
    if (dryRun) {
      const { data } = await api.post('/billing/preview');
      return adaptBillingRun(data);
    }
    const { data } = await api.post('/billing/run', { dryRun: false });
    return adaptBillingRun(data);
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5. PAYMENTS
// ─────────────────────────────────────────────────────────────────────
export async function recordPayment({ invoiceId, method, amount, date, note = '' }) {
  if (!isReal('payments')) {
    await sleep(rand(400, 600));
    const inv = mockInvoices.find((i) => i.id === invoiceId || i.number === invoiceId);
    if (!inv) throw Object.assign(new Error('Invoice not found'), { code: 'NOT_FOUND' });

    if (inv.status === 'Cancelled') {
      const err = new Error("Can't record a payment on a cancelled invoice");
      err.code = 'CANCELLED';
      throw err;
    }

    if (inv.status === 'Draft') {
      const err = new Error('Invoice must be confirmed before accepting payments');
      err.code = 'NOT_CONFIRMED';
      throw err;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      const err = new Error('Amount must be greater than 0');
      err.code = 'AMOUNT_INVALID';
      throw err;
    }

    const outstanding = +(inv.total - inv.paidAmount).toFixed(2);
    if (numAmount > outstanding + 0.001) {
      const err = new Error('Payment exceeds the outstanding amount');
      err.code = 'OVERPAYMENT';
      throw err;
    }

    const payment = {
      id: `pay_${Date.now()}`,
      invoiceId,
      invoiceNumber: inv.number || inv.invoiceNumber,
      customerName: inv.customerName,
      method,
      amount: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      note: note || '',
    };

    inv.payments = [...(inv.payments || []), payment];
    inv.paidAmount = +((inv.paidAmount || 0) + numAmount).toFixed(2);
    inv.outstanding = +(inv.total - inv.paidAmount).toFixed(2);

    if (inv.paidAmount >= inv.total - 0.001) {
      inv.status = 'Paid';
      inv.outstanding = 0;
    }

    mockPayments.push(payment);
    return { ok: true, payment, invoice: adaptInvoice(normaliseInvoice(inv)) };
  }

  try {
    const { data } = await api.post('/payments', { invoiceId, method, amount, date, note });
    return {
      ok: true,
      payment: adaptPayment(data.payment),
      invoice: adaptInvoice(data.invoice),
    };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listPayments({
  page = 1,
  pageSize = 10,
  method = '',
  from = '',
  to = '',
  search = '',
} = {}) {
  if (!isReal('payments')) {
    await sleep(rand(300, 500));
    let list = [...mockPayments];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.invoiceNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.note || '').toLowerCase().includes(q)
      );
    }

    if (method) list = list.filter((p) => p.method.toLowerCase() === method.toLowerCase());
    if (from) list = list.filter((p) => inDateRange(p.date, from, null));
    if (to) list = list.filter((p) => inDateRange(p.date, null, to));

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }

  try {
    const { data } = await api.get('/payments', {
      params: { page, pageSize, method, from, to, search },
    });
    return {
      ...data,
      data: (data?.data || []).map(adaptPayment),
    };
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 6. CUSTOMERS
// ─────────────────────────────────────────────────────────────────────
// 6. CUSTOMERS
// ─────────────────────────────────────────────────────────────────────
export async function listCustomers({ page = 1, pageSize = 10, search = '' } = {}) {
  if (!isReal('customers')) {
    await sleep(350);
    let list = mockCustomers.map((c) => {
      const subs = mockSubscriptions.filter((s) => s.customerId === c.id);
      const activeSubs = subs.filter((s) => s.status === 'Active').length;
      const invs = mockInvoices.filter((i) => i.customerId === c.id);
      const outstanding = invs.reduce((sum, i) => sum + (Number(i.outstanding) || 0), 0);
      const totalPaid = invs.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
      return {
        ...c,
        activeSubscriptions: activeSubs || c.activeSubscriptions || 0,
        outstanding,
        totalPaid: totalPaid || c.totalSpend || 0,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }
    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }

  try {
    const { data } = await api.get('/customers', { params: { page, pageSize, search } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getCustomer(id) {
  if (!isReal('customers')) {
    await sleep(350);
    const customer = mockCustomers.find((c) => c.id === id);
    if (!customer) {
      const err = new Error('Customer not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const subscriptions = mockSubscriptions.filter((s) => s.customerId === id);
    const invoices = mockInvoices.filter((i) => i.customerId === id).map(normaliseInvoice);
    const payments = mockInvoices
      .filter((i) => i.customerId === id)
      .flatMap((i) => i.payments || []);
    const activeSubs = subscriptions.filter((s) => s.status === 'Active').length;
    const outstanding = invoices.reduce((sum, i) => sum + (Number(i.outstanding) || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);

    return {
      ...customer,
      activeSubscriptions: activeSubs || customer.activeSubscriptions || 0,
      outstanding,
      totalPaid: totalPaid || customer.totalSpend || 0,
      subscriptions,
      invoices,
      payments,
    };
  }

  try {
    const { data } = await api.get(`/customers/${id}`);
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 7. CATALOG (Products, Plans, Taxes, Discounts, Templates)
// ─────────────────────────────────────────────────────────────────────
export async function listProducts({ page = 1, pageSize = 50, search = '' } = {}) {
  if (!isReal('products')) {
    await sleep(350);
    let list = [...mockProducts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.type && p.type.toLowerCase().includes(q))
      );
    }
    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }
  try {
    const { data } = await api.get('/products', { params: { page, pageSize, search } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listPlans({ page = 1, pageSize = 50, search = '' } = {}) {
  if (!isReal('plans')) {
    await sleep(350);
    let list = [...mockPlans];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.period && p.period.toLowerCase().includes(q))
      );
    }
    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);
    return { data: paginated, page, pageSize, total };
  }
  try {
    const { data } = await api.get('/plans', { params: { page, pageSize, search } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listTaxes({ page = 1, pageSize = 50 } = {}) {
  if (!isReal('taxes')) {
    await sleep(250);
    return { data: mockTaxes, page, pageSize, total: mockTaxes.length };
  }
  try {
    const { data } = await api.get('/taxes', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listDiscounts({ page = 1, pageSize = 50 } = {}) {
  if (!isReal('discounts')) {
    await sleep(250);
    return { data: mockDiscounts, page, pageSize, total: mockDiscounts.length };
  }
  try {
    const { data } = await api.get('/discounts', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listQuotationTemplates({ page = 1, pageSize = 50 } = {}) {
  if (!isReal('quotation-templates')) {
    await sleep(250);
    return { data: [], page, pageSize, total: 0 };
  }
  try {
    const { data } = await api.get('/quotation-templates', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

/**
 * Parallel Catalog Fetcher:
 * Calls /customers, /plans, /products, /taxes, /discounts in parallel (pageSize 200)
 */
export async function getCatalog() {
  const [customersRes, plansRes, productsRes, taxesRes, discountsRes] = await Promise.all([
    listCustomers({ pageSize: 200 }),
    listPlans({ pageSize: 200 }),
    listProducts({ pageSize: 200 }),
    listTaxes({ pageSize: 200 }),
    listDiscounts({ pageSize: 200 }),
  ]);

  return {
    customers: customersRes?.data || [],
    plans: plansRes?.data || [],
    products: productsRes?.data || [],
    taxes: taxesRes?.data || [],
    discounts: discountsRes?.data || [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// 8. STAFF MANAGEMENT (Admin only)
// ─────────────────────────────────────────────────────────────────────
export async function listStaff() {
  if (!isReal('staff')) {
    await sleep(250);
    return {
      staff: [
        {
          id: 'usr_staff_02',
          name: 'David Miller (Ops)',
          email: 'staff@brightloop.com',
          role: 'staff',
          created_at: '2026-01-15T09:00:00Z',
        },
      ],
    };
  }

  try {
    const { data } = await api.get('/staff');
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function addStaff(payload) {
  if (!isReal('staff')) {
    await sleep(400);
    return {
      user: {
        id: `usr_staff_${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: 'staff',
        created_at: new Date().toISOString(),
      },
    };
  }

  try {
    const { data } = await api.post('/staff', payload);
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 9. CATALOG WRITES (with '-write' feature flags)
// ─────────────────────────────────────────────────────────────────────
function checkStaffForbidden() {
  try {
    const raw = localStorage.getItem('brightloop_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'staff') {
        const err = new Error("Staff role is view only. You don't have permission to perform this action.");
        err.code = 'FORBIDDEN';
        err.status = 403;
        throw err;
      }
    }
  } catch (err) {
    if (err.code === 'FORBIDDEN') throw err;
  }
}

/**
 * Product Management
 */
export async function createProduct(payload) {
  checkStaffForbidden();
  if (!isRealWrite('products')) {
    await sleep(350);
    const newProd = {
      id: `prd_${Date.now()}`,
      name: payload.name,
      type: payload.type || 'Service',
      salesPrice: parseFloat(payload.salesPrice || 0),
      costPrice: parseFloat(payload.costPrice || 0),
      notes: payload.notes || '',
      variants: Array.isArray(payload.variants) ? payload.variants : [],
    };
    mockProducts.push(newProd);
    return { ok: true, product: newProd };
  }
  const { data } = await api.post('/products', payload);
  return data;
}

export async function updateProduct(id, payload) {
  checkStaffForbidden();
  if (!isRealWrite('products')) {
    await sleep(350);
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx === -1) {
      const err = new Error('Product not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    mockProducts[idx] = {
      ...mockProducts[idx],
      ...payload,
      salesPrice: payload.salesPrice !== undefined ? parseFloat(payload.salesPrice) : mockProducts[idx].salesPrice,
      costPrice: payload.costPrice !== undefined ? parseFloat(payload.costPrice) : mockProducts[idx].costPrice,
    };
    return { ok: true, product: mockProducts[idx] };
  }
  const { data } = await api.patch(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  checkStaffForbidden();
  if (!isRealWrite('products')) {
    await sleep(300);
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockProducts.splice(idx, 1);
    }
    return { ok: true };
  }
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function addVariant(productId, variantData) {
  checkStaffForbidden();
  if (!isRealWrite('products')) {
    await sleep(300);
    const prod = mockProducts.find((p) => p.id === productId);
    if (!prod) {
      const err = new Error('Product not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const extraPrice = parseFloat(variantData.extraPrice || 0);
    const unitPrice = parseFloat(prod.salesPrice || 0) + extraPrice;
    const newVar = {
      id: `var_${Date.now()}`,
      attribute: variantData.attribute,
      value: variantData.value,
      extraPrice,
      unitPrice,
    };
    prod.variants = prod.variants || [];
    prod.variants.push(newVar);
    return { ok: true, variant: newVar, product: prod };
  }
  const { data } = await api.post(`/products/${productId}/variants`, variantData);
  return data;
}

/**
 * Plan Management
 */
export async function createPlan(payload) {
  checkStaffForbidden();
  if (!isRealWrite('plans')) {
    await sleep(350);
    const newPlan = {
      id: `pln_${Date.now()}`,
      name: payload.name,
      price: parseFloat(payload.price || 0),
      period: payload.period || 'monthly',
      billingPeriod: payload.period || 'monthly',
      minQty: parseInt(payload.minQty || 1, 10),
      validFrom: payload.validFrom || new Date().toISOString().split('T')[0],
      validTo: payload.validTo || '2028-12-31',
      autoClose: Boolean(payload.autoClose),
      closable: payload.closable !== false,
      pausable: payload.pausable !== false,
      renewable: payload.renewable !== false,
    };
    mockPlans.push(newPlan);
    return { ok: true, plan: newPlan };
  }
  const { data } = await api.post('/plans', payload);
  return data;
}

export async function updatePlan(id, payload) {
  checkStaffForbidden();
  if (!isRealWrite('plans')) {
    await sleep(350);
    const idx = mockPlans.findIndex((p) => p.id === id);
    if (idx === -1) {
      const err = new Error('Plan not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    mockPlans[idx] = {
      ...mockPlans[idx],
      ...payload,
      price: payload.price !== undefined ? parseFloat(payload.price) : mockPlans[idx].price,
      minQty: payload.minQty !== undefined ? parseInt(payload.minQty, 10) : mockPlans[idx].minQty,
    };
    return { ok: true, plan: mockPlans[idx] };
  }
  const { data } = await api.patch(`/plans/${id}`, payload);
  return data;
}

export async function deletePlan(id) {
  checkStaffForbidden();
  if (!isRealWrite('plans')) {
    await sleep(300);
    const idx = mockPlans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPlans.splice(idx, 1);
    }
    return { ok: true };
  }
  const { data } = await api.delete(`/plans/${id}`);
  return data;
}

/**
 * Create Tax:
 * Expected body: { name: string, rate: number, appliesTo: string }
 */
export async function createTax(payload) {
  if (!isRealWrite('taxes')) {
    await sleep(300);
    const newTax = { id: `tax_${Date.now()}`, ...payload };
    mockTaxes.push(newTax);
    return { ok: true, tax: newTax };
  }
  const { data } = await api.post('/taxes', payload);
  return data;
}

/**
 * Create Discount:
 * Expected body: { code: string, type: 'percentage'|'fixed', value: number, minPurchase?: number, minQty?: number, startDate?: string, endDate?: string, appliesTo: 'all'|'product', targetProductId?: string }
 */
export async function createDiscount(payload) {
  if (!isRealWrite('discounts')) {
    await sleep(300);
    const newDiscount = {
      id: `disc_${Date.now()}`,
      ...payload,
      usedCount: 0,
      active: true,
    };
    mockDiscounts.push(newDiscount);
    return { ok: true, discount: newDiscount };
  }
  const { data } = await api.post('/discounts', payload);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// 10. CUSTOMER PORTAL (Scoped by JWT — UI never sends customerId)
// ─────────────────────────────────────────────────────────────────────
export async function getMyPortalSummary() {
  const loggedInUser = (() => {
    try {
      const stored = localStorage.getItem('brightloop_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  if (!isReal('portal')) {
    await sleep(300);
    const custId = loggedInUser?.id || 'cust_01';
    const custSubs = mockSubscriptions.filter((s) => s.customerId === custId && s.status === 'Active');
    const custInvoices = mockInvoices.filter(
      (i) => i.customerId === custId && ['Confirmed', 'Overdue'].includes(i.status) && i.outstanding > 0
    );

    const amountOwed = custInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);
    const overdueList = custInvoices.filter(
      (i) => i.status === 'Overdue' || (i.dueDate && new Date(i.dueDate) < new Date())
    );

    return adaptPortalSummary(
      {
        amountOwed,
        overdueCount: overdueList.length,
        activeSubscriptions: custSubs.length,
        nextBillingDate: custSubs[0]?.nextBillingDate || null,
      },
      loggedInUser,
      custInvoices
    );
  }

  try {
    const [summaryRes, invoicesRes] = await Promise.all([
      api.get('/portal/summary'),
      api.get('/portal/invoices').catch(() => ({ data: { data: [] } })),
    ]);

    const unpaidInvoices = (invoicesRes.data?.data || []).map(adaptInvoice);
    return adaptPortalSummary(summaryRes.data, loggedInUser, unpaidInvoices);
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listMySubscriptions() {
  if (!isReal('portal')) {
    await sleep(300);
    const loggedInUser = (() => {
      try {
        const stored = localStorage.getItem('brightloop_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
    const custId = loggedInUser?.id || 'cust_01';
    const list = mockSubscriptions
      .filter((s) => s.customerId === custId)
      .map(adaptPortalSubscription);
    return { data: list, total: list.length };
  }

  try {
    const { data } = await api.get('/portal/subscriptions');
    const items = (data?.data || []).map(adaptPortalSubscription);
    return { data: items, total: data?.total ?? items.length };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getMySubscription(id) {
  if (!isReal('portal')) {
    await sleep(300);
    const sub = mockSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id);
    if (!sub) {
      const err = new Error('Subscription not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return adaptPortalSubscription(sub);
  }

  try {
    const { data } = await api.get(`/portal/subscriptions/${id}`);
    return adaptPortalSubscription(data);
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listMyInvoices(params = {}) {
  if (!isReal('portal')) {
    await sleep(300);
    const loggedInUser = (() => {
      try {
        const stored = localStorage.getItem('brightloop_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
    const custId = loggedInUser?.id || 'cust_01';
    let list = mockInvoices.filter((i) => i.customerId === custId).map(normaliseInvoice);

    if (params.status) {
      list = list.filter((i) => i.status.toLowerCase() === params.status.toLowerCase());
    }

    const total = list.length;
    return { data: list.map(adaptInvoice), page: 1, pageSize: total, total };
  }

  try {
    const { data } = await api.get('/portal/invoices', { params });
    return {
      ...data,
      data: (data?.data || []).map(adaptInvoice),
    };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function getMyInvoice(id) {
  if (!isReal('portal')) {
    await sleep(300);
    const inv = mockInvoices.find((i) => i.id === id || i.number === id || i.invoiceNumber === id);
    if (!inv) {
      const err = new Error('Invoice not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return adaptInvoice(normaliseInvoice(inv));
  }

  try {
    const { data } = await api.get(`/portal/invoices/${id}`);
    return adaptInvoice(data);
  } catch (err) {
    throw adaptError(err);
  }
}

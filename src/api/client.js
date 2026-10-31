import api from './axios';
import {
  getStore,
  saveStore,
  today,
  roundMoney,
  createError,
  computeInvoiceStatus,
  computeInvoiceDaysOverdue,
  nextNumber,
  requireRole,
  getSessionUser,
} from './mock/store';
import { computeAllowedActions } from './mock/db';
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

const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/** Normalise an invoice for list responses (adds computed status and daysOverdue) */
function normaliseInvoice(inv) {
  if (!inv) return null;
  const status = computeInvoiceStatus(inv);
  const daysOverdue = computeInvoiceDaysOverdue(inv);
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
  requireRole('admin', 'staff');

  if (!isReal('dashboard')) {
    await sleep(250);
    const store = getStore();
    const { from, to, customerId, status } = filters;

    let filteredInvoices = (store.invoices || []).map(normaliseInvoice);

    if (customerId) {
      filteredInvoices = filteredInvoices.filter((i) => String(i.customerId) === String(customerId));
    }
    if (status) {
      filteredInvoices = filteredInvoices.filter(
        (i) => String(i.status).toLowerCase() === String(status).toLowerCase()
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

    let filteredSubs = store.subscriptions || [];
    if (customerId) {
      filteredSubs = filteredSubs.filter((s) => String(s.customerId) === String(customerId));
    }

    const activeSubscriptions = filteredSubs.filter((s) => s.status === 'Active').length;
    const revenueCollected = roundMoney(
      filteredInvoices
        .filter((i) => i.status === 'Paid')
        .reduce((s, i) => s + (Number(i.total) || 0), 0)
    );
    const outstanding = roundMoney(
      filteredInvoices
        .filter((i) => ['Confirmed', 'Overdue'].includes(i.status))
        .reduce((s, i) => s + (Number(i.outstanding) || 0), 0)
    );
    const overdueList = filteredInvoices.filter((i) => i.status === 'Overdue');
    const overdueCount = overdueList.length;
    const overdueAmount = roundMoney(
      overdueList.reduce((s, i) => s + (Number(i.outstanding) || 0), 0)
    );

    const statusCounts = { Paid: 0, Confirmed: 0, Draft: 0, Overdue: 0, Cancelled: 0 };
    filteredInvoices.forEach((inv) => {
      if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    });

    const statusBreakdown = Object.entries(statusCounts).map(([st, count]) => ({
      status: st,
      count,
    }));

    // 12-month revenue curve
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const revenueByMonth = months.map((m, idx) => ({
      month: `2026-${String((idx % 12) + 1).padStart(2, '0')}`,
      label: m,
      revenue: Math.round(revenueCollected ? (revenueCollected / 12) * (idx + 1) : 400000 + idx * 45000),
    }));

    const overdueInvoices = overdueList.map((inv) => ({
      id: inv.id,
      number: inv.number || inv.invoiceNumber,
      customerName: inv.customerName,
      total: inv.total,
      outstanding: inv.outstanding,
      dueDate: inv.dueDate,
      daysOverdue: inv.daysOverdue,
      isReminderSent: Boolean(inv.isReminderSent),
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
  requireRole('admin', 'staff');

  if (!isReal('dashboard') && !isReal('invoices')) {
    await sleep(200);
    const dashboardData = await getDashboard({ from, to, customerId });
    const list = dashboardData.overdueInvoices || [];
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
  requireRole('admin', 'staff');

  if (!isReal('invoices') && !isReal('dashboard')) {
    await sleep(300);
    const store = getStore();
    const inv = (store.invoices || []).find((i) => String(i.id) === String(invoiceId));
    if (inv) {
      inv.isReminderSent = true;
      saveStore(store);
    }
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
  return getDashboard(filters);
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
  requireRole('admin', 'staff');

  if (!isReal('subscriptions')) {
    await sleep(300);
    const store = getStore();
    let list = [...(store.subscriptions || [])];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.subscriptionNumber || '').toLowerCase().includes(q) ||
          (s.customerName || '').toLowerCase().includes(q)
      );
    }
    if (status) {
      list = list.filter((s) => String(s.status).toLowerCase() === String(status).toLowerCase());
    }
    if (plan) {
      list = list.filter(
        (s) => String(s.planId) === String(plan) || (s.planName || '').toLowerCase() === plan.toLowerCase()
      );
    }
    if (customer) {
      list = list.filter(
        (s) =>
          String(s.customerId) === String(customer) ||
          (s.customerName || '').toLowerCase().includes(customer.toLowerCase())
      );
    }

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
  requireRole('admin', 'staff');

  if (!isReal('subscriptions')) {
    await sleep(250);
    const store = getStore();
    const sub = (store.subscriptions || []).find(
      (s) => String(s.id) === String(id) || String(s.subscriptionNumber) === String(id)
    );
    if (!sub) {
      throw createError('NOT_FOUND', 'Subscription not found');
    }

    const customer = (store.customers || []).find((c) => String(c.id) === String(sub.customerId)) || {
      id: sub.customerId,
      name: sub.customerName,
      email: 'billing@customer.com',
      phone: '+91 98765 43210',
      address: 'Business Park, Mumbai',
    };
    const plan = (store.plans || []).find((p) => String(p.id) === String(sub.planId)) || {
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

    const subInvoices = (store.invoices || [])
      .filter((i) => String(i.subscriptionId) === String(sub.id))
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
  requireRole('admin', 'staff');

  if (!isReal('subscriptions')) {
    await sleep(350);
    const store = getStore();
    const subNumber = nextNumber('SUB');
    const subId = `sub_${subNumber.replace('SUB-', '')}`;

    const customer = (store.customers || []).find((c) => String(c.id) === String(payload.customerId)) || {
      name: 'Acme Traders',
    };
    const plan = (store.plans || []).find((p) => String(p.id) === String(payload.planId)) || {
      name: 'CRM Monthly',
      period: 'monthly',
    };

    const rawLines = payload.lines || [];
    let subtotal = 0;
    let totalSeats = 0;
    const lines = rawLines.map((l, idx) => {
      const prod = (store.products || []).find((p) => String(p.id) === String(l.productId));
      const variant = prod?.variants?.find((v) => String(v.id) === String(l.variantId));
      const unitPrice = (prod ? Number(prod.salesPrice) : 2000) + (variant ? Number(variant.extraPrice || variant.price || 0) : 0);
      const qty = parseInt(l.qty || 1, 10);
      const amount = roundMoney(unitPrice * qty);
      subtotal += amount;
      totalSeats += qty;
      return {
        id: `${subId}_l${idx + 1}`,
        productId: l.productId,
        productName: prod?.name || 'Brightloop CRM',
        variantId: l.variantId,
        variantLabel: variant ? `${variant.attribute || 'Variant'}: ${variant.value || variant.name}` : null,
        qty,
        unitPrice,
        taxRate: 18,
        amount,
      };
    });

    const isBulk = totalSeats >= 5;
    const discountAmt = isBulk ? roundMoney(subtotal * 0.1) : 0;
    const taxable = roundMoney(subtotal - discountAmt);
    const taxAmt = roundMoney(taxable * 0.18);
    const total = roundMoney(taxable + taxAmt);

    const initialStatus = payload.status || 'Draft';
    const startDate = payload.startDate || today();
    const nextBillingDate = initialStatus === 'Active' ? startDate : null;

    const newSub = {
      id: subId,
      subscriptionNumber: subNumber,
      number: subNumber,
      customerId: String(payload.customerId),
      customerName: customer.name,
      planId: String(payload.planId),
      planName: plan.name,
      billingPeriod: plan.period || 'monthly',
      seats: totalSeats,
      unitPrice: lines[0]?.unitPrice || 2560,
      discountCode: isBulk ? 'BULK10' : null,
      discountRate: isBulk ? 0.1 : 0,
      taxLabel: 'GST 18%',
      taxRate: 0.18,
      status: initialStatus,
      startDate,
      expiryDate: payload.expiryDate || null,
      paymentTerms: payload.paymentTerms || 'Net 15',
      nextBillingDate,
      createdAt: new Date().toISOString(),
      lines,
      amount: total,
    };

    store.subscriptions = store.subscriptions || [];
    store.subscriptions.unshift(newSub);
    saveStore(store);

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

export async function transitionSubscription(id, action) {
  requireRole('admin', 'staff');
  const normAction = (action || '').toLowerCase();

  if (normAction === 'cancel') {
    const notSupportedErr = createError('NOT_SUPPORTED', "Cancel isn't available yet");
    throw notSupportedErr;
  }

  if (!isReal('subscriptions')) {
    await sleep(250);
    const store = getStore();
    const sub = (store.subscriptions || []).find(
      (s) => String(s.id) === String(id) || String(s.subscriptionNumber) === String(id)
    );
    if (!sub) throw createError('NOT_FOUND', 'Subscription not found');

    const plan = (store.plans || []).find((p) => String(p.id) === String(sub.planId)) || {};
    const allowed = computeAllowedActions(sub.status, plan);
    if (!allowed.includes(normAction)) {
      throw createError('ILLEGAL_TRANSITION', `Cannot perform '${action}' on subscription in '${sub.status}' state`);
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
        sub.nextBillingDate = sub.nextBillingDate || sub.startDate || today();
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
        sub.nextBillingDate = today();
        break;
      default:
        break;
    }

    saveStore(store);
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

export async function previewSubscriptionPrice({ lines = [], customerId = null, planId = null, discountCode = null } = {}) {
  if (!isReal('subscriptions')) {
    await sleep(150);
    const store = getStore();
    let subtotal = 0;
    let totalQty = 0;

    const processedLines = (lines || []).map((l) => {
      const prod = (store.products || []).find((p) => String(p.id) === String(l.productId));
      const basePrice = prod ? Number(prod.salesPrice) : 2000;
      const variant = prod?.variants?.find((v) => String(v.id) === String(l.variantId));
      const extraPrice = variant ? Number(variant.extraPrice || variant.price || 0) : 0;
      const unitPrice = basePrice + extraPrice;
      const lineQty = Math.max(1, parseInt(l.qty || 1, 10));
      const amount = roundMoney(unitPrice * lineQty);
      subtotal += amount;
      totalQty += lineQty;
      return {
        ...l,
        unitPrice,
        amount,
      };
    });

    subtotal = roundMoney(subtotal);
    let discountAmount = 0;
    let appliedDiscountCode = discountCode || null;

    if (!appliedDiscountCode && totalQty >= 5) {
      appliedDiscountCode = 'BULK10';
    }

    if (appliedDiscountCode) {
      const disc = (store.discounts || []).find(
        (d) => String(d.code).toUpperCase() === String(appliedDiscountCode).toUpperCase() && d.active !== false
      );
      if (disc) {
        if (disc.type === 'percentage') {
          discountAmount = roundMoney(subtotal * (Number(disc.value) / 100));
        } else {
          discountAmount = roundMoney(Number(disc.value));
        }
      } else if (String(appliedDiscountCode).toUpperCase() === 'BULK10') {
        discountAmount = roundMoney(subtotal * 0.1);
      }
    }

    const taxable = roundMoney(Math.max(0, subtotal - discountAmount));
    const tax = roundMoney(taxable * 0.18);
    const total = roundMoney(taxable + tax);

    return {
      lines: processedLines,
      subtotal,
      discount: discountAmount,
      discountTotal: discountAmount,
      discountCode: appliedDiscountCode,
      discountLabel: appliedDiscountCode ? `${appliedDiscountCode}` : null,
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
  requireRole('admin', 'staff');

  if (!isReal('invoices')) {
    await sleep(250);
    const store = getStore();
    let list = (store.invoices || []).map(normaliseInvoice);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.number || i.invoiceNumber || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q)
      );
    }

    if (status) {
      list = list.filter((i) => String(i.status).toLowerCase() === String(status).toLowerCase());
    }

    if (customerId) {
      list = list.filter((i) => String(i.customerId) === String(customerId));
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
  requireRole('admin', 'staff');

  if (!isReal('invoices')) {
    await sleep(200);
    const store = getStore();
    const inv = (store.invoices || []).find(
      (i) => String(i.id) === String(id) || String(i.number) === String(id) || String(i.invoiceNumber) === String(id)
    );
    if (!inv) throw createError('NOT_FOUND', 'Invoice not found');
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
  requireRole('admin', 'staff');

  if (!isReal('invoices')) {
    await sleep(300);
    const store = getStore();
    const inv = (store.invoices || []).find((i) => String(i.id) === String(id));
    if (!inv) throw createError('NOT_FOUND', 'Invoice not found');
    if (inv.status !== 'Draft') {
      throw createError('NOT_CONFIRMED', 'Only Draft invoices can be confirmed');
    }
    inv.status = 'Confirmed';
    saveStore(store);
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
  requireRole('admin', 'staff');

  if (!isReal('invoices')) {
    await sleep(300);
    const store = getStore();
    const inv = (store.invoices || []).find((i) => String(i.id) === String(id));
    if (!inv) throw createError('NOT_FOUND', 'Invoice not found');
    if (!['Draft', 'Confirmed'].includes(inv.status)) {
      throw createError('ILLEGAL_TRANSITION', `Cannot cancel a ${inv.status} invoice`);
    }
    inv.status = 'Cancelled';
    inv.outstanding = 0;
    saveStore(store);
    return { ok: true, invoice: adaptInvoice(normaliseInvoice(inv)) };
  }

  try {
    const { data } = await api.post(`/invoices/${id}/cancel`);
    return { ok: true, invoice: adaptInvoice(data.invoice || data) };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function sendInvoice(id) {
  await sleep(300);
  return { ok: true, message: 'Invoice dispatched to customer email' };
}

export async function listOpenInvoices({ search = '' } = {}) {
  requireRole('admin', 'staff');

  if (!isReal('invoices')) {
    await sleep(200);
    const store = getStore();
    let list = (store.invoices || [])
      .map(normaliseInvoice)
      .filter((i) => (i.status === 'Confirmed' || i.status === 'Overdue') && roundMoney(i.outstanding) > 0.005);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.number || i.invoiceNumber || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q)
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
  requireRole('admin', 'staff');

  if (!isReal('billing')) {
    await sleep(400);
    const store = getStore();
    const todayStr = today();
    const dueSubs = (store.subscriptions || []).filter(
      (s) => s.status === 'Active' && s.nextBillingDate && String(s.nextBillingDate) <= todayStr
    );

    const created = [];
    const failed = [];
    let skippedDuplicates = 0;

    for (const sub of dueSubs) {
      const periodStart = sub.nextBillingDate;
      const periodEndDate = new Date(periodStart);
      const days = sub.billingPeriod === 'quarterly' ? 90 : sub.billingPeriod === 'yearly' ? 365 : 30;
      periodEndDate.setDate(periodEndDate.getDate() + days - 1);
      const periodEnd = periodEndDate.toISOString().split('T')[0];

      // IDEMPOTENCY: skip duplicate invoice for same sub and period
      const exists = (store.invoices || []).find(
        (i) => String(i.subscriptionId) === String(sub.id) && i.periodStart === periodStart
      );
      if (exists) {
        skippedDuplicates++;
        continue;
      }

      const seats = parseInt(sub.seats || 1, 10);
      const unitPrice = Number(sub.unitPrice || 2560);
      const subtotal = roundMoney(seats * unitPrice);
      const discountRate = sub.discountRate !== undefined ? Number(sub.discountRate) : (seats >= 5 ? 0.1 : 0);
      const discountAmt = roundMoney(subtotal * discountRate);
      const taxable = roundMoney(subtotal - discountAmt);
      const taxRate = sub.taxRate !== undefined ? Number(sub.taxRate) : 0.18;
      const taxAmt = roundMoney(taxable * taxRate);
      const total = roundMoney(taxable + taxAmt);

      const dueDateObj = new Date(periodEnd);
      dueDateObj.setDate(dueDateObj.getDate() + 15);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      if (!dryRun) {
        const invNumber = nextNumber('INV');
        const invId = `inv_${invNumber.replace('INV-', '')}_${sub.id}`;
        const cust = (store.customers || []).find((c) => String(c.id) === String(sub.customerId)) || {};

        if (sub.discountCode) {
          const disc = (store.discounts || []).find((d) => String(d.code) === String(sub.discountCode));
          if (disc) {
            disc.usedCount = (disc.usedCount || 0) + 1;
          }
        }

        const newInv = {
          id: invId,
          number: invNumber,
          invoiceNumber: invNumber,
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber || sub.number,
          customerId: String(sub.customerId),
          customerName: sub.customerName || cust.name,
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
          discountLabel: sub.discountCode ? `${sub.discountCode}` : null,
          taxLabel: 'GST 18%',
          createdAt: new Date().toISOString(),
          customer: {
            name: sub.customerName || cust.name,
            email: cust.email || '',
            address: cust.address || '',
          },
          lines: [
            {
              id: `${invId}_l1`,
              description: `${sub.planName || 'CRM Monthly'} — ${periodStart} to ${periodEnd}`,
              qty: seats,
              unitPrice,
              taxLabel: 'GST 18%',
              amount: subtotal,
            },
          ],
          payments: [],
        };

        store.invoices = store.invoices || [];
        store.invoices.unshift(newInv);

        // Advance nextBillingDate only after successful create
        const nextDate = new Date(sub.nextBillingDate);
        nextDate.setDate(nextDate.getDate() + days);
        sub.nextBillingDate = nextDate.toISOString().split('T')[0];

        created.push({
          invoiceId: invId,
          number: invNumber,
          customerName: sub.customerName || cust.name,
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

    if (!dryRun && created.length > 0) {
      saveStore(store);
    }

    const dueCount = dueSubs.length;
    const estimatedTotal = roundMoney(created.reduce((s, c) => s + c.total, 0));

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
  requireRole('admin', 'staff');

  if (!isReal('payments')) {
    await sleep(350);
    const store = getStore();
    const inv = (store.invoices || []).find(
      (i) => String(i.id) === String(invoiceId) || String(i.number) === String(invoiceId) || String(i.invoiceNumber) === String(invoiceId)
    );
    if (!inv) throw createError('NOT_FOUND', 'Invoice not found');

    if (inv.status === 'Cancelled') {
      throw createError('CANCELLED', "Can't record a payment on a cancelled invoice");
    }

    if (inv.status === 'Draft') {
      throw createError('NOT_CONFIRMED', 'Invoice must be confirmed before accepting payments');
    }

    const numAmount = roundMoney(amount);
    if (!numAmount || numAmount <= 0) {
      throw createError('VALIDATION', 'Payment amount must be greater than zero');
    }

    const currentOutstanding = roundMoney(
      inv.outstanding !== undefined ? inv.outstanding : Number(inv.total || 0) - Number(inv.paidAmount || 0)
    );
    if (numAmount > currentOutstanding + 0.005) {
      throw createError('OVERPAYMENT', 'Payment exceeds the outstanding amount');
    }

    const payId = nextNumber('PAY');
    const payment = {
      id: payId,
      invoiceId: inv.id,
      invoiceNumber: inv.number || inv.invoiceNumber,
      customerName: inv.customerName,
      method: method || 'Bank Transfer',
      amount: numAmount,
      date: date || today(),
      note: note || '',
    };

    inv.payments = [...(inv.payments || []), payment];
    inv.paidAmount = roundMoney(Number(inv.paidAmount || 0) + numAmount);
    inv.outstanding = roundMoney(Math.max(0, Number(inv.total || 0) - inv.paidAmount));

    if (inv.outstanding <= 0.005) {
      inv.status = 'Paid';
      inv.outstanding = 0;
    }

    store.payments = store.payments || [];
    store.payments.unshift(payment);

    saveStore(store);

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
  requireRole('admin', 'staff');

  if (!isReal('payments')) {
    await sleep(250);
    const store = getStore();
    let list = [...(store.payments || [])];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.invoiceNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.note || '').toLowerCase().includes(q)
      );
    }

    if (method) list = list.filter((p) => String(p.method).toLowerCase() === method.toLowerCase());
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
export async function listCustomers({ page = 1, pageSize = 10, search = '', balanceFilter = 'all' } = {}) {
  requireRole('admin', 'staff');

  if (!isReal('customers')) {
    await sleep(250);
    const store = getStore();
    let list = (store.customers || []).map((c) => {
      const subs = (store.subscriptions || []).filter((s) => String(s.customerId) === String(c.id));
      const activeSubs = subs.filter((s) => s.status === 'Active').length;
      const invs = (store.invoices || []).filter((i) => String(i.customerId) === String(c.id));
      const outstanding = roundMoney(
        invs
          .filter((i) => ['Confirmed', 'Overdue'].includes(i.status))
          .reduce((sum, i) => sum + (Number(i.outstanding) || 0), 0)
      );
      const totalPaid = roundMoney(
        invs.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
      );
      return {
        ...c,
        activeSubscriptions: activeSubs,
        outstanding,
        totalPaid,
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

    if (balanceFilter === 'with_balance') {
      list = list.filter((c) => c.outstanding > 0);
    } else if (balanceFilter === 'zero_balance') {
      list = list.filter((c) => c.outstanding <= 0);
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
  requireRole('admin', 'staff');

  if (!isReal('customers')) {
    await sleep(250);
    const store = getStore();
    const targetId = String(id || '').trim();
    const customer = (store.customers || []).find(
      (c) =>
        String(c.id) === targetId ||
        String(c.id).toLowerCase() === targetId.toLowerCase() ||
        String(c.id) === `cust_${targetId.padStart(2, '0')}` ||
        String(c.id) === `cust_${targetId}` ||
        String(c.id).replace(/\D/g, '') === targetId
    ) || (store.customers || [])[0];

    if (!customer) {
      throw createError('NOT_FOUND', 'Customer not found');
    }

    const custId = String(customer.id);
    const subscriptions = (store.subscriptions || []).filter((s) => String(s.customerId) === custId);
    const invoices = (store.invoices || []).filter((i) => String(i.customerId) === custId).map(normaliseInvoice);
    const invoiceIds = new Set(invoices.map((i) => String(i.id)));
    const payments = (store.payments || []).filter(
      (p) => invoiceIds.has(String(p.invoiceId)) || String(p.customerName).toLowerCase() === String(customer.name).toLowerCase()
    );

    const activeSubs = subscriptions.filter((s) => s.status === 'Active').length;
    const outstanding = roundMoney(
      invoices
        .filter((i) => ['Confirmed', 'Overdue'].includes(i.status))
        .reduce((sum, i) => sum + (Number(i.outstanding) || 0), 0)
    );
    const totalPaid = roundMoney(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));

    return {
      ...customer,
      activeSubscriptions: activeSubs,
      outstanding,
      totalPaid,
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
  requireRole('admin', 'staff');

  if (!isReal('products')) {
    await sleep(250);
    const store = getStore();
    let list = [...(store.products || [])];
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
  requireRole('admin', 'staff');

  if (!isReal('plans')) {
    await sleep(250);
    const store = getStore();
    let list = [...(store.plans || [])];
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
  requireRole('admin', 'staff');

  if (!isReal('taxes')) {
    await sleep(200);
    const store = getStore();
    const taxes = store.taxes || [];
    return { data: taxes, page, pageSize, total: taxes.length };
  }
  try {
    const { data } = await api.get('/taxes', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listDiscounts({ page = 1, pageSize = 50 } = {}) {
  requireRole('admin', 'staff');

  if (!isReal('discounts')) {
    await sleep(200);
    const store = getStore();
    const discounts = store.discounts || [];
    return { data: discounts, page, pageSize, total: discounts.length };
  }
  try {
    const { data } = await api.get('/discounts', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listQuotationTemplates({ page = 1, pageSize = 50 } = {}) {
  requireRole('admin', 'staff');

  if (!isReal('quotation-templates')) {
    await sleep(200);
    const store = getStore();
    const templates = store.templates || [];
    return { data: templates, page, pageSize, total: templates.length };
  }
  try {
    const { data } = await api.get('/quotation-templates', { params: { page, pageSize } });
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

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
  requireRole('admin');

  if (!isReal('staff')) {
    await sleep(250);
    const store = getStore();
    const staffList = (store.users || []).filter((u) => u.role === 'staff');
    return { staff: staffList };
  }

  try {
    const { data } = await api.get('/staff');
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

export async function addStaff(payload) {
  requireRole('admin');

  if (!isReal('staff')) {
    await sleep(350);
    const store = getStore();
    const email = String(payload?.email || '').trim().toLowerCase();
    const name = String(payload?.name || '').trim();

    if (!email || !name) {
      throw createError('VALIDATION', 'Name and email are required');
    }

    const exists = (store.users || []).some(
      (u) => String(u.email || '').toLowerCase() === email
    );
    if (exists) {
      throw createError('DUPLICATE_EMAIL', 'A user with this email address already exists.');
    }

    const newStaff = {
      id: `usr_staff_${Date.now()}`,
      name,
      email,
      role: 'staff',
      password: 'Demo@Brightloop2025!',
      created_at: new Date().toISOString(),
    };

    store.users = store.users || [];
    store.users.push(newStaff);
    saveStore(store);

    return { user: newStaff };
  }

  try {
    const { data } = await api.post('/staff', payload);
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 9. CATALOG WRITES (Admin only)
// ─────────────────────────────────────────────────────────────────────
export async function createProduct(payload) {
  requireRole('admin');

  if (!isRealWrite('products')) {
    await sleep(350);
    const store = getStore();
    const newProd = {
      id: `prd_${Date.now()}`,
      name: payload.name,
      type: payload.type || 'Service',
      category: payload.category || 'Software',
      salesPrice: roundMoney(payload.salesPrice || 0),
      costPrice: roundMoney(payload.costPrice || 0),
      notes: payload.notes || '',
      canBeSold: payload.canBeSold !== false,
      canBeRented: payload.canBeRented !== false,
      variants: Array.isArray(payload.variants) ? payload.variants : [],
    };
    store.products = store.products || [];
    store.products.push(newProd);
    saveStore(store);
    return { ok: true, product: newProd };
  }
  const { data } = await api.post('/products', payload);
  return data;
}

export async function updateProduct(id, payload) {
  requireRole('admin');

  if (!isRealWrite('products')) {
    await sleep(350);
    const store = getStore();
    const idx = (store.products || []).findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw createError('NOT_FOUND', 'Product not found');
    store.products[idx] = {
      ...store.products[idx],
      ...payload,
      salesPrice: payload.salesPrice !== undefined ? roundMoney(payload.salesPrice) : store.products[idx].salesPrice,
      costPrice: payload.costPrice !== undefined ? roundMoney(payload.costPrice) : store.products[idx].costPrice,
    };
    saveStore(store);
    return { ok: true, product: store.products[idx] };
  }
  const { data } = await api.patch(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  requireRole('admin');

  if (!isRealWrite('products')) {
    await sleep(300);
    const store = getStore();
    const idx = (store.products || []).findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      store.products.splice(idx, 1);
      saveStore(store);
    }
    return { ok: true };
  }
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function addVariant(productId, variantData) {
  requireRole('admin');

  if (!isRealWrite('products')) {
    await sleep(300);
    const store = getStore();
    const prod = (store.products || []).find((p) => String(p.id) === String(productId));
    if (!prod) throw createError('NOT_FOUND', 'Product not found');

    const extraPrice = roundMoney(variantData.extraPrice || variantData.price || 0);
    const unitPrice = roundMoney(Number(prod.salesPrice || 0) + extraPrice);
    const newVar = {
      id: `var_${Date.now()}`,
      attribute: variantData.attribute || 'Variant',
      value: variantData.value || variantData.name || 'Standard',
      name: variantData.name || `${variantData.attribute || 'Variant'}: ${variantData.value || 'Standard'}`,
      extraPrice,
      price: extraPrice,
      unitPrice,
    };
    prod.variants = prod.variants || [];
    prod.variants.push(newVar);
    saveStore(store);
    return { ok: true, variant: newVar, product: prod };
  }
  const { data } = await api.post(`/products/${productId}/variants`, variantData);
  return data;
}

export async function createPlan(payload) {
  requireRole('admin');

  if (!isRealWrite('plans')) {
    await sleep(350);
    const store = getStore();
    const newPlan = {
      id: `pln_${Date.now()}`,
      name: payload.name,
      price: roundMoney(payload.price || 0),
      period: payload.period || 'monthly',
      billingPeriod: payload.period || 'monthly',
      minQty: parseInt(payload.minQty || 1, 10),
      validFrom: payload.validFrom || today(),
      validTo: payload.validTo || '2028-12-31',
      autoClose: Boolean(payload.autoClose),
      closable: payload.closable !== false,
      pausable: payload.pausable !== false,
      renewable: payload.renewable !== false,
    };
    store.plans = store.plans || [];
    store.plans.push(newPlan);
    saveStore(store);
    return { ok: true, plan: newPlan };
  }
  const { data } = await api.post('/plans', payload);
  return data;
}

export async function updatePlan(id, payload) {
  requireRole('admin');

  if (!isRealWrite('plans')) {
    await sleep(350);
    const store = getStore();
    const idx = (store.plans || []).findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw createError('NOT_FOUND', 'Plan not found');
    store.plans[idx] = {
      ...store.plans[idx],
      ...payload,
      price: payload.price !== undefined ? roundMoney(payload.price) : store.plans[idx].price,
      minQty: payload.minQty !== undefined ? parseInt(payload.minQty, 10) : store.plans[idx].minQty,
    };
    saveStore(store);
    return { ok: true, plan: store.plans[idx] };
  }
  const { data } = await api.patch(`/plans/${id}`, payload);
  return data;
}

export async function deletePlan(id) {
  requireRole('admin');

  if (!isRealWrite('plans')) {
    await sleep(300);
    const store = getStore();
    const idx = (store.plans || []).findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      store.plans.splice(idx, 1);
      saveStore(store);
    }
    return { ok: true };
  }
  const { data } = await api.delete(`/plans/${id}`);
  return data;
}

export async function createTax(payload) {
  requireRole('admin');

  if (!isRealWrite('taxes')) {
    await sleep(300);
    const store = getStore();
    const newTax = { id: `tax_${Date.now()}`, ...payload };
    store.taxes = store.taxes || [];
    store.taxes.push(newTax);
    saveStore(store);
    return { ok: true, tax: newTax };
  }
  const { data } = await api.post('/taxes', payload);
  return data;
}

export async function createDiscount(payload) {
  requireRole('admin');

  if (!isRealWrite('discounts')) {
    await sleep(300);
    const store = getStore();
    const newDiscount = {
      id: `disc_${Date.now()}`,
      ...payload,
      usedCount: 0,
      active: true,
    };
    store.discounts = store.discounts || [];
    store.discounts.push(newDiscount);
    saveStore(store);
    return { ok: true, discount: newDiscount };
  }
  const { data } = await api.post('/discounts', payload);
  return data;
}

export async function updateDiscount(id, payload) {
  requireRole('admin');

  if (!isRealWrite('discounts')) {
    await sleep(300);
    const store = getStore();
    const disc = (store.discounts || []).find(
      (d) => String(d.id) === String(id) || String(d.code).toUpperCase() === String(id).toUpperCase()
    );
    if (!disc) throw createError('NOT_FOUND', 'Discount not found');
    Object.assign(disc, payload);
    saveStore(store);
    return { ok: true, discount: disc };
  }
  const { data } = await api.patch(`/discounts/${id}`, payload);
  return data;
}

// ─────────────────────────────────────────────────────────────────────
// 10. CUSTOMER PORTAL (Scoped by JWT session customerId)
// ─────────────────────────────────────────────────────────────────────
export async function getMyPortalSummary() {
  const sessionUser = requireRole('customer');
  const custId = String(sessionUser.customerId || sessionUser.id);

  if (!isReal('portal')) {
    await sleep(250);
    const store = getStore();
    const custSubs = (store.subscriptions || []).filter(
      (s) => String(s.customerId) === custId && s.status === 'Active'
    );
    const custInvoices = (store.invoices || [])
      .map(normaliseInvoice)
      .filter((i) => String(i.customerId) === custId && ['Confirmed', 'Overdue'].includes(i.status) && roundMoney(i.outstanding) > 0.005);

    const amountOwed = roundMoney(custInvoices.reduce((sum, inv) => sum + Number(inv.outstanding || 0), 0));
    const overdueList = custInvoices.filter((i) => i.status === 'Overdue');
    const overdueTotal = roundMoney(overdueList.reduce((sum, inv) => sum + Number(inv.outstanding || 0), 0));

    const adapted = adaptPortalSummary(
      {
        amountOwed,
        outstandingTotal: amountOwed,
        overdueCount: overdueList.length,
        overdueTotal,
        activeSubscriptions: custSubs.length,
        nextBillingDate: custSubs[0]?.nextBillingDate || null,
      },
      sessionUser,
      custInvoices
    );
    return {
      ...adapted,
      amountOwed,
      outstandingTotal: amountOwed,
    };
  }

  try {
    const [summaryRes, invoicesRes] = await Promise.all([
      api.get('/portal/summary'),
      api.get('/portal/invoices').catch(() => ({ data: { data: [] } })),
    ]);

    const unpaidInvoices = (invoicesRes.data?.data || []).map(adaptInvoice);
    const adapted = adaptPortalSummary(summaryRes.data, sessionUser, unpaidInvoices);
    return {
      ...adapted,
      amountOwed: adapted.outstandingTotal ?? 0,
    };
  } catch (err) {
    throw adaptError(err);
  }
}

export async function listMySubscriptions() {
  const sessionUser = requireRole('customer');
  const custId = String(sessionUser.customerId || sessionUser.id);

  if (!isReal('portal')) {
    await sleep(250);
    const store = getStore();
    const list = (store.subscriptions || [])
      .filter((s) => String(s.customerId) === custId)
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
  const sessionUser = requireRole('customer');
  const custId = String(sessionUser.customerId || sessionUser.id);

  if (!isReal('portal')) {
    await sleep(250);
    const store = getStore();
    const sub = (store.subscriptions || []).find(
      (s) => String(s.id) === String(id) || String(s.subscriptionNumber) === String(id)
    );
    if (!sub || String(sub.customerId) !== custId) {
      throw createError('NOT_FOUND', 'Subscription not found');
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
  const sessionUser = requireRole('customer');
  const custId = String(sessionUser.customerId || sessionUser.id);

  if (!isReal('portal')) {
    await sleep(250);
    const store = getStore();
    let list = (store.invoices || [])
      .filter((i) => String(i.customerId) === custId)
      .map(normaliseInvoice);

    if (params.status) {
      list = list.filter((i) => String(i.status).toLowerCase() === String(params.status).toLowerCase());
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
  const sessionUser = requireRole('customer');
  const custId = String(sessionUser.customerId || sessionUser.id);

  if (!isReal('portal')) {
    await sleep(250);
    const store = getStore();
    const inv = (store.invoices || []).find(
      (i) => String(i.id) === String(id) || String(i.number) === String(id) || String(i.invoiceNumber) === String(id)
    );
    if (!inv || String(inv.customerId) !== custId) {
      throw createError('NOT_FOUND', 'Invoice not found');
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

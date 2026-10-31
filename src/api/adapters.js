/**
 * src/api/adapters.js
 * ============================================================
 * Pure adapters converting backend responses and errors into the exact
 * shapes expected by the Brightloop UI contract.
 */

// ─────────────────────────────────────────────────────────────
// A. ERROR ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptError(err) {
  if (!err) {
    const fallback = new Error('An unknown error occurred');
    fallback.code = 'UNKNOWN_ERROR';
    return fallback;
  }

  // Network / server offline
  if (err.code === 'ERR_NETWORK' || !err.response) {
    const netErr = new Error("Can't reach the server. Please check your internet or try again later.");
    netErr.code = 'NETWORK_ERROR';
    netErr.originalError = err;
    return netErr;
  }

  const status = err.response?.status;
  const rawMsg = err.response?.data?.error || err.response?.data?.message || err.message || '';
  const lowerMsg = rawMsg.toLowerCase();

  let code = 'API_ERROR';
  if (status === 403) {
    code = 'FORBIDDEN';
  } else if (status === 404) {
    code = 'NOT_FOUND';
  } else if (status === 401) {
    code = 'UNAUTHORIZED';
  } else if (lowerMsg.includes('exceed') || lowerMsg.includes('overpay')) {
    code = 'OVERPAYMENT';
  } else if (lowerMsg.includes('cancel')) {
    code = 'CANCELLED';
  } else if (lowerMsg.includes('draft') || lowerMsg.includes('confirmed before')) {
    code = 'NOT_CONFIRMED';
  } else if (
    lowerMsg.includes('transition') ||
    lowerMsg.includes('status') ||
    lowerMsg.includes('cannot perform') ||
    lowerMsg.includes('expected')
  ) {
    code = 'ILLEGAL_TRANSITION';
  }

  const error = new Error(rawMsg || 'A server error occurred');
  error.code = code;
  error.status = status;
  error.response = err.response;
  return error;
}

// ─────────────────────────────────────────────────────────────
// B. PORTAL SUMMARY ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptPortalSummary(backendData, loggedInUser, unpaidInvoices = []) {
  const amountOwed = parseFloat(backendData?.amountOwed || 0);
  const overdueCount = parseInt(backendData?.overdueCount || 0, 10);
  const activeSubscriptions = parseInt(backendData?.activeSubscriptions || 0, 10);

  let overdueTotal = 0;
  let nextPayment = null;

  if (Array.isArray(unpaidInvoices) && unpaidInvoices.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    unpaidInvoices.forEach((inv) => {
      const outstanding = parseFloat(inv.outstanding || 0);
      if (inv.status === 'Overdue' || (inv.dueDate && inv.dueDate < todayStr)) {
        overdueTotal += outstanding;
      }
    });

    const sorted = [...unpaidInvoices].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    if (sorted[0]) {
      nextPayment = {
        invoiceId: sorted[0].id,
        invoiceNumber: sorted[0].number || sorted[0].invoiceNumber,
        amount: parseFloat(sorted[0].outstanding || sorted[0].total),
        dueDate: sorted[0].dueDate,
      };
    }
  }

  return {
    customerName: loggedInUser?.name || 'Customer',
    outstandingTotal: amountOwed,
    overdueCount,
    overdueTotal: Math.round(overdueTotal * 100) / 100,
    nextPayment,
    activeSubscriptions,
    nextBillingDate: backendData?.nextBillingDate || null,
  };
}

// ─────────────────────────────────────────────────────────────
// C. PORTAL SUBSCRIPTIONS ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptPortalSubscription(sub) {
  if (!sub) return null;

  const rawLines = sub.lines || [];
  let subtotal = 0;
  let taxTotal = 0;

  const adaptedLines = rawLines.map((l) => {
    const qty = parseInt(l.qty || 1, 10);
    const unitPrice = parseFloat(l.unitPrice || l.unit_price || 0);
    const lineAmount = parseFloat(l.amount || qty * unitPrice);
    subtotal += lineAmount;

    let taxRate = 18;
    if (l.taxRate !== undefined) taxRate = parseFloat(l.taxRate);
    else if (l.tax_rate !== undefined) taxRate = parseFloat(l.tax_rate);

    const lineTax = Math.round(lineAmount * (taxRate / 100) * 100) / 100;
    taxTotal += lineTax;

    return {
      id: l.id,
      productId: l.productId || l.product_id,
      productName: l.productName || l.product_name,
      variantLabel: l.variant || l.variantLabel || null,
      qty,
      unitPrice,
      taxLabel: l.taxLabel || `GST ${taxRate}%`,
      taxRate,
      amount: lineAmount,
    };
  });

  const total = Math.round((subtotal + taxTotal) * 100) / 100;

  return {
    ...sub,
    period: sub.billingPeriod || sub.period || 'monthly',
    billingPeriod: sub.billingPeriod || sub.period || 'monthly',
    amount: parseFloat(sub.totalAmount || sub.amount || total),
    totalAmount: parseFloat(sub.totalAmount || sub.amount || total),
    lines: adaptedLines,
    summary: {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: 0,
      discountLabel: null,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// D. ADMIN SUBSCRIPTION DETAIL ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptAdminSubscription(sub) {
  if (!sub) return null;

  const lines = (sub.lines || []).map((l) => {
    const qty = parseInt(l.qty || 1, 10);
    const unitPrice = parseFloat(l.unitPrice || l.unit_price || 0);
    const amount = parseFloat(l.amount || qty * unitPrice);
    const taxRate = parseFloat(l.taxRate || l.tax_rate || 18);
    return {
      ...l,
      qty,
      unitPrice,
      taxRate,
      taxLabel: `GST ${taxRate}%`,
      amount,
    };
  });

  let subtotal = 0;
  let taxTotal = 0;
  lines.forEach((l) => {
    subtotal += l.amount;
    taxTotal += Math.round(l.amount * (l.taxRate / 100) * 100) / 100;
  });

  // Keep discount from invoices or contract if present; otherwise 0
  // TODO: Calculate real-time discount candidates or fetch from price-preview
  const discountTotal = parseFloat(sub.discountTotal || sub.discount_total || 0);
  const discountLabel = sub.discountCode ? `${sub.discountCode}` : null;
  const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

  return {
    ...sub,
    lines,
    summary: {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal,
      discountLabel,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total,
    },
    allowedActions: sub.allowedActions || [],
  };
}

// ─────────────────────────────────────────────────────────────
// E. PRICE PREVIEW ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptPricePreview(backendRes, inputLines = []) {
  const subtotal = parseFloat(backendRes?.subtotal || 0);
  const discountTotal = parseFloat(backendRes?.discountTotal ?? backendRes?.discount ?? 0);
  const taxTotal = parseFloat(backendRes?.taxTotal ?? backendRes?.tax ?? 0);
  const total = parseFloat(backendRes?.total || 0);
  const discountCode = backendRes?.discountCode || (discountTotal > 0 ? 'BULK10' : null);

  return {
    lines: inputLines,
    subtotal,
    discount: discountTotal,
    discountTotal,
    discountCode,
    discountLabel: discountCode ? `${discountCode}` : null,
    tax: taxTotal,
    taxTotal,
    total,
    taxable: Math.round((subtotal - discountTotal) * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────
// F. BILLING RUN ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptBillingRun(res) {
  const skippedDuplicates = parseInt(res?.skippedDuplicates ?? res?.alreadyBilledCount ?? 0, 10);
  return {
    dryRun: Boolean(res?.dryRun),
    dueCount: parseInt(res?.dueCount || 0, 10),
    estimatedTotal: parseFloat(res?.estimatedTotal || 0),
    alreadyBilledCount: skippedDuplicates,
    skippedDuplicates,
    created: Array.isArray(res?.created) ? res.created : [],
    failed: Array.isArray(res?.failed) ? res.failed : [],
  };
}

// ─────────────────────────────────────────────────────────────
// G. INVOICE ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptInvoice(inv) {
  if (!inv) return null;
  const total = parseFloat(inv.total || 0);
  const paidAmount = parseFloat(inv.paidAmount || inv.paid_amount || 0);
  const outstanding = parseFloat(
    inv.outstanding !== undefined ? inv.outstanding : Math.max(0, total - paidAmount)
  );

  return {
    ...inv,
    number: inv.number || inv.invoiceNumber,
    invoiceNumber: inv.number || inv.invoiceNumber,
    total,
    paidAmount,
    outstanding,
    dueDate: inv.dueDate || inv.due_date,
    daysOverdue: parseInt(inv.daysOverdue ?? inv.days_overdue ?? 0, 10),
    status: inv.status || 'Draft',
    customer: inv.customer || {
      name: inv.customerName || 'Customer',
      email: '',
      address: '',
    },
    lines: Array.isArray(inv.lines) ? inv.lines : [],
    payments: Array.isArray(inv.payments) ? inv.payments : [],
  };
}

// ─────────────────────────────────────────────────────────────
// H. PAYMENT ADAPTER
// ─────────────────────────────────────────────────────────────
export function adaptPayment(pay) {
  if (!pay) return null;
  return {
    id: pay.id,
    invoiceId: pay.invoiceId || pay.invoice_id,
    invoiceNumber: pay.invoiceNumber || pay.invoice_number,
    customerName: pay.customerName || pay.customer_name || 'Customer',
    method: pay.method,
    amount: parseFloat(pay.amount || 0),
    date: pay.date,
    note: pay.note || '',
  };
}

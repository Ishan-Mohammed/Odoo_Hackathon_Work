import api from './axios';
import {
  mockWorkedExample,
  mockCustomers,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
  mock12MonthRevenue,
} from './mock/db';
import { USE_MOCK } from '../config/env';

/**
 * =====================================================================
 * API CLIENT CONTRACT & RESPONSE SCHEMAS
 * =====================================================================
 * 1. getDashboard(filters)
 *    Request: { from?: string, to?: string, customerId?: string, status?: string }
 *    Response: {
 *      stats: {
 *        activeSubscriptions: number,
 *        revenueCollected: number,
 *        outstanding: number,
 *        overdueCount: number,
 *        overdueAmount: number
 *      },
 *      revenueByMonth: Array<{ month: string, label: string, revenue: number }>,
 *      statusBreakdown: Array<{ status: 'Paid' | 'Confirmed' | 'Draft' | 'Overdue' | 'Cancelled', count: number }>,
 *      overdueInvoices: Array<{
 *        id: string,
 *        number: string,
 *        customerName: string,
 *        total: number,
 *        outstanding: number,
 *        dueDate: string,
 *        daysOverdue: number
 *      }>
 *    }
 *
 * 2. getOverdueInvoices({ page, pageSize, from, to, customerId })
 *    Response: {
 *      data: Array<{ id, number, customerName, total, outstanding, dueDate, daysOverdue }>,
 *      page: number,
 *      pageSize: number,
 *      total: number
 *    }
 *
 * 3. sendReminder(invoiceId)
 *    Response: { ok: boolean }
 *
 * 4. listSubscriptions({ page, pageSize, search, status })
 *    Response: { data: Array<Subscription>, page: number, pageSize: number, total: number }
 *
 * 5. listInvoices({ page, pageSize, search, status })
 *    Response: { data: Array<Invoice>, page: number, pageSize: number, total: number }
 *
 * 6. getInvoice(id)
 *    Response: InvoiceObject
 *
 * 7. listPayments({ page, pageSize })
 *    Response: { data: Array<Payment>, page: number, pageSize: number, total: number }
 *
 * 8. listCustomers({ page, pageSize, search })
 *    Response: { data: Array<Customer>, page: number, pageSize: number, total: number }
 * =====================================================================
 */

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Session cache for reminders sent during this session
const sentRemindersSet = new Set();

/**
 * Master Dashboard Aggregation Endpoint
 */
export async function getDashboard(filters = {}) {
  if (USE_MOCK) {
    await sleep(350);

    const { from, to, customerId, status } = filters;

    // Filter invoices by customer, status, and date range
    let filteredInvoices = [...mockInvoices];

    if (customerId) {
      const targetCustomer = mockCustomers.find((c) => c.id === customerId);
      if (targetCustomer) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.customerName.toLowerCase() === targetCustomer.name.toLowerCase()
        );
      }
    }

    if (status) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (from) {
      const fromTime = new Date(from).getTime();
      filteredInvoices = filteredInvoices.filter((inv) => {
        const t = new Date(inv.createdAt || inv.dueDate).getTime();
        return t >= fromTime;
      });
    }

    if (to) {
      const toTime = new Date(to).getTime();
      filteredInvoices = filteredInvoices.filter((inv) => {
        const t = new Date(inv.createdAt || inv.dueDate).getTime();
        return t <= toTime;
      });
    }

    // Filter subscriptions
    let filteredSubs = [...mockSubscriptions];
    if (customerId) {
      filteredSubs = filteredSubs.filter((s) => s.customerId === customerId);
    }

    // Aggregations
    const activeSubscriptions = filteredSubs.filter((s) => s.status === 'Active').length;

    const revenueCollected = filteredInvoices
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + i.total, 0);

    const outstandingInvoices = filteredInvoices.filter(
      (i) => i.status === 'Confirmed' || i.status === 'Overdue' || i.status === 'Draft'
    );
    const outstanding = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);

    const overdueList = filteredInvoices.filter((i) => i.status === 'Overdue');
    const overdueCount = overdueList.length;
    const overdueAmount = overdueList.reduce((sum, i) => sum + i.total, 0);

    // Status Breakdown (Paid, Confirmed, Draft, Overdue, Cancelled)
    const statusCounts = {
      Paid: 0,
      Confirmed: 0,
      Draft: 0,
      Overdue: 0,
      Cancelled: 0,
    };

    filteredInvoices.forEach((inv) => {
      const st = inv.status;
      if (statusCounts[st] !== undefined) {
        statusCounts[st] += 1;
      } else {
        statusCounts.Draft += 1;
      }
    });

    const statusBreakdown = Object.entries(statusCounts).map(([st, count]) => ({
      status: st,
      count,
    }));

    // Revenue by Month (12 months from seed data)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = mock12MonthRevenue.map((item, idx) => {
      // Scale if customer filter is applied
      const scaleFactor = customerId ? 0.15 : 1;
      return {
        month: `2025-${String((idx % 12) + 1).padStart(2, '0')}`,
        label: item.month.split(' ')[0],
        revenue: Math.round(item.revenue * scaleFactor),
      };
    });

    // Overdue Invoices Table List
    const overdueInvoices = overdueList.map((inv) => ({
      id: inv.id,
      number: inv.invoiceNumber,
      customerName: inv.customerName,
      total: inv.total,
      outstanding: inv.total,
      dueDate: inv.dueDate,
      daysOverdue: inv.daysOverdue || 5,
      isReminderSent: sentRemindersSet.has(inv.id),
    }));

    return {
      stats: {
        activeSubscriptions,
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

  const { data } = await api.get('/dashboard', { params: filters });
  return data;
}

/**
 * Paginated Overdue Invoices
 */
export async function getOverdueInvoices({ page = 1, pageSize = 5, from, to, customerId } = {}) {
  if (USE_MOCK) {
    await sleep(300);
    const dashboardData = await getDashboard({ from, to, customerId });
    const list = dashboardData.overdueInvoices;

    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    return {
      data: paginated,
      page,
      pageSize,
      total,
    };
  }

  const { data } = await api.get('/invoices/overdue', {
    params: { page, pageSize, from, to, customerId },
  });
  return data;
}

/**
 * Send Payment Reminder for an Overdue Invoice
 */
export async function sendReminder(invoiceId) {
  if (USE_MOCK) {
    await sleep(400);
    sentRemindersSet.add(invoiceId);
    return { ok: true };
  }

  const { data } = await api.post(`/invoices/${invoiceId}/reminder`);
  return data;
}

export async function listSubscriptions({ page = 1, pageSize = 10, search = '', status = '' } = {}) {
  if (USE_MOCK) {
    await sleep(350);
    let list = [...mockSubscriptions];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.subscriptionNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q)
      );
    }

    if (status) {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    return {
      data: paginated,
      page,
      pageSize,
      total,
    };
  }

  const { data } = await api.get('/subscriptions', {
    params: { page, pageSize, search, status },
  });
  return data;
}

export async function listInvoices({ page = 1, pageSize = 10, search = '', status = '' } = {}) {
  if (USE_MOCK) {
    await sleep(350);
    let list = [...mockInvoices];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      );
    }

    if (status) {
      list = list.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    return {
      data: paginated,
      page,
      pageSize,
      total,
    };
  }

  const { data } = await api.get('/invoices', {
    params: { page, pageSize, search, status },
  });
  return data;
}

export async function getInvoice(id) {
  if (USE_MOCK) {
    await sleep(300);
    const invoice =
      mockInvoices.find((i) => i.id === id || i.invoiceNumber === id) ||
      mockWorkedExample.invoice;
    return invoice;
  }

  const { data } = await api.get(`/invoices/${id}`);
  return data;
}

export async function listPayments({ page = 1, pageSize = 10 } = {}) {
  if (USE_MOCK) {
    await sleep(350);
    const total = mockPayments.length;
    const start = (page - 1) * pageSize;
    const paginated = mockPayments.slice(start, start + pageSize);

    return {
      data: paginated,
      page,
      pageSize,
      total,
    };
  }

  const { data } = await api.get('/payments', {
    params: { page, pageSize },
  });
  return data;
}

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

    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    return {
      data: paginated,
      page,
      pageSize,
      total,
    };
  }

  const { data } = await api.get('/customers', {
    params: { page, pageSize, search },
  });
  return data;
}

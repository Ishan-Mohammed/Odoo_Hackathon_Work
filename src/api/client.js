import api from './axios';
import {
  mockWorkedExample,
  mockCustomers,
  mockSubscriptions,
  mockInvoices,
  mockPayments,
  mock12MonthRevenue,
} from './mock/db';

/**
 * =====================================================================
 * API CLIENT CONTRACT & RESPONSE SCHEMAS
 * =====================================================================
 * 1. getDashboardStats()
 *    Response: {
 *      mrr: number,
 *      activeSubscriptions: number,
 *      totalOverdue: number,
 *      churnRate: string,
 *      revenueTrend: Array<{ month: string, revenue: number, newSubscriptions: number }>,
 *      recentInvoices: Array<Invoice>
 *    }
 *
 * 2. listSubscriptions({ page, pageSize, search, status })
 *    Response: { data: Array<Subscription>, page: number, pageSize: number, total: number }
 *
 * 3. listInvoices({ page, pageSize, search, status })
 *    Response: { data: Array<Invoice>, page: number, pageSize: number, total: number }
 *
 * 4. getInvoice(id)
 *    Response: InvoiceObject
 *
 * 5. listPayments({ page, pageSize })
 *    Response: { data: Array<Payment>, page: number, pageSize: number, total: number }
 *
 * 6. listCustomers({ page, pageSize, search })
 *    Response: { data: Array<Customer>, page: number, pageSize: number, total: number }
 * =====================================================================
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboardStats() {
  if (USE_MOCK) {
    await sleep(350);
    const totalOverdue = mockInvoices
      .filter((i) => i.status === 'Overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const totalMRR = mockSubscriptions
      .filter((s) => s.status === 'Active')
      .reduce((sum, s) => sum + s.mrr, 0);

    return {
      mrr: totalMRR,
      activeSubscriptions: mockSubscriptions.filter((s) => s.status === 'Active').length,
      totalOverdue,
      churnRate: '1.2%',
      revenueTrend: mock12MonthRevenue,
      recentInvoices: mockInvoices.slice(0, 5),
    };
  }

  const { data } = await api.get('/dashboard/stats');
  return data;
}

export async function listSubscriptions({ page = 1, pageSize = 10, search = '', status = '' } = {}) {
  if (USE_MOCK) {
    await sleep(400);
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
    await sleep(400);
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

export async function listCustomers({ page = 1, pageSize = 10, search = '' } = {}) {
  if (USE_MOCK) {
    await sleep(350);
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

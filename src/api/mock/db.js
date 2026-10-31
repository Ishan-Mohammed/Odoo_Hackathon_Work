/**
 * Brightloop Central In-Memory Mock Database
 * Includes exact worked hackathon reference numbers:
 * Product: "Brightloop CRM" (2,000) + variant "Brand: Odoo" (+560) = 2,560
 * Customer: Acme Traders (5 seats) = 12,800.00
 * Discount: BULK10 (10%) = -1,280.00
 * Taxable: 11,520.00
 * GST 18%: 2,073.60
 * Invoice INV-0042: 13,593.60 (Paid by UPI)
 */

export const mockWorkedExample = {
  product: {
    id: 'prd_crm',
    name: 'Brightloop CRM',
    basePrice: 2000.0,
    variant: 'Brand: Odoo',
    variantPrice: 560.0,
    unitPrice: 2560.0,
  },
  plan: {
    id: 'pln_monthly',
    name: 'CRM Monthly',
    billingPeriod: 'monthly',
    minQuantity: 1,
  },
  customer: {
    id: 'cust_acme',
    name: 'Acme Traders',
    email: 'billing@acme.com',
    phone: '+91 98765 43210',
    city: 'Mumbai',
    seats: 5,
  },
  calculation: {
    quantity: 5,
    unitPrice: 2560.0,
    subtotal: 12800.0,
    discountCode: 'BULK10',
    discountAmount: 1280.0,
    taxableAmount: 11520.0,
    gstRate: 0.18,
    gstAmount: 2073.6,
    total: 13593.6,
  },
  invoice: {
    id: 'inv_0042',
    invoiceNumber: 'INV-0042',
    customerName: 'Acme Traders',
    customerEmail: 'billing@acme.com',
    subscriptionId: 'SUB-0042',
    productName: 'Brightloop CRM (Brand: Odoo)',
    seats: 5,
    unitPrice: 2560.0,
    subtotal: 12800.0,
    discountCode: 'BULK10',
    discountAmount: 1280.0,
    taxableAmount: 11520.0,
    taxRate: '18% GST',
    taxAmount: 2073.6,
    total: 13593.6,
    status: 'Paid',
    paymentMethod: 'UPI',
    paidAt: '2026-03-12T10:30:00Z',
    dueDate: '2026-03-20',
    createdAt: '2026-03-12T09:00:00Z',
  },
};

// 12 Customers
export const mockCustomers = [
  { id: 'cust_01', name: 'Acme Traders', email: 'billing@acme.com', phone: '+91 98765 43210', city: 'Mumbai', activeSubscriptions: 3, totalSpend: 245000.0 },
  { id: 'cust_02', name: 'Zenith Logistics', email: 'ops@zenithlogistics.in', phone: '+91 98220 11223', city: 'Bangalore', activeSubscriptions: 2, totalSpend: 180000.0 },
  { id: 'cust_03', name: 'Nova Healthtech', email: 'finance@novahealth.co', phone: '+91 99341 55667', city: 'Hyderabad', activeSubscriptions: 4, totalSpend: 540000.0 },
  { id: 'cust_04', name: 'Apex Retailers', email: 'accounts@apexretail.in', phone: '+91 97112 33445', city: 'Delhi', activeSubscriptions: 1, totalSpend: 95000.0 },
  { id: 'cust_05', name: 'Kavita Textiles', email: 'kavita@textiles.com', phone: '+91 94250 88776', city: 'Surat', activeSubscriptions: 2, totalSpend: 125000.0 },
  { id: 'cust_06', name: 'BluePeak Analytics', email: 'admin@bluepeak.io', phone: '+91 98860 99001', city: 'Pune', activeSubscriptions: 5, totalSpend: 820000.0 },
  { id: 'cust_07', name: 'Matrix Hospitality', email: 'matrix@hotels.in', phone: '+91 98100 44556', city: 'Jaipur', activeSubscriptions: 1, totalSpend: 65000.0 },
  { id: 'cust_08', name: 'Starlight Media', email: 'billing@starlight.agency', phone: '+91 97401 22334', city: 'Chennai', activeSubscriptions: 3, totalSpend: 310000.0 },
  { id: 'cust_09', name: 'Falcon Agro Corp', email: 'procure@falconagro.com', phone: '+91 93122 77889', city: 'Chandigarh', activeSubscriptions: 2, totalSpend: 195000.0 },
  { id: 'cust_10', name: 'Elevate EdTech', email: 'accounts@elevate.study', phone: '+91 98990 66778', city: 'Noida', activeSubscriptions: 4, totalSpend: 460000.0 },
  { id: 'cust_11', name: 'Quantum FinServ', email: 'accounts@quantumfin.in', phone: '+91 98711 12345', city: 'Mumbai', activeSubscriptions: 3, totalSpend: 620000.0 },
  { id: 'cust_12', name: 'UrbanCraft Interiors', email: 'hello@urbancraft.design', phone: '+91 99200 88990', city: 'Kolkata', activeSubscriptions: 1, totalSpend: 45000.0 },
];

// 40 Subscriptions with varied statuses
const subscriptionStatuses = ['Active', 'Active', 'Active', 'Confirmed', 'Quotation', 'Paused', 'Draft', 'Closed'];
export const mockSubscriptions = Array.from({ length: 40 }).map((_, i) => {
  const index = i + 1;
  const numStr = String(index).padStart(4, '0');
  const cust = mockCustomers[i % mockCustomers.length];
  const isWorked = index === 42 || index === 1;

  const status = isWorked ? 'Active' : subscriptionStatuses[i % subscriptionStatuses.length];
  const seats = isWorked ? 5 : ((i % 10) + 1) * 2;
  const unitPrice = isWorked ? 2560.0 : 2000.0 + (i % 4) * 350;
  const mrr = Math.round(seats * unitPrice * 0.9);

  return {
    id: `sub_${numStr}`,
    subscriptionNumber: `SUB-${numStr}`,
    customerId: cust.id,
    customerName: isWorked ? 'Acme Traders' : cust.name,
    planName: 'CRM Monthly',
    seats,
    unitPrice,
    mrr,
    status,
    nextBillingDate: '2026-04-12',
    startDate: '2025-04-12',
    createdAt: '2025-04-10T10:00:00Z',
  };
});

// Replace SUB-0042 specifically
mockSubscriptions[0] = {
  id: 'sub_0042',
  subscriptionNumber: 'SUB-0042',
  customerId: 'cust_01',
  customerName: 'Acme Traders',
  planName: 'CRM Monthly',
  seats: 5,
  unitPrice: 2560.0,
  mrr: 11520.0,
  status: 'Active',
  nextBillingDate: '2026-04-12',
  startDate: '2026-03-12',
  createdAt: '2026-03-10T10:00:00Z',
};

// 12 Months of paid invoices for revenue chart
export const mock12MonthRevenue = [
  { month: 'Apr 2025', revenue: 420000, newSubscriptions: 12 },
  { month: 'May 2025', revenue: 465000, newSubscriptions: 15 },
  { month: 'Jun 2025', revenue: 510000, newSubscriptions: 18 },
  { month: 'Jul 2025', revenue: 540000, newSubscriptions: 14 },
  { month: 'Aug 2025', revenue: 590000, newSubscriptions: 22 },
  { month: 'Sep 2025', revenue: 640000, newSubscriptions: 25 },
  { month: 'Oct 2025', revenue: 685000, newSubscriptions: 20 },
  { month: 'Nov 2025', revenue: 730000, newSubscriptions: 28 },
  { month: 'Dec 2025', revenue: 790000, newSubscriptions: 31 },
  { month: 'Jan 2026', revenue: 840000, newSubscriptions: 26 },
  { month: 'Feb 2026', revenue: 890000, newSubscriptions: 30 },
  { month: 'Mar 2026', revenue: 955000, newSubscriptions: 35 },
];

// Invoices list (including INV-0042 and 8 overdue invoices)
export const mockInvoices = [
  mockWorkedExample.invoice,
  // 8 Overdue invoices
  {
    id: 'inv_0043',
    invoiceNumber: 'INV-0043',
    customerName: 'Matrix Hospitality',
    subscriptionId: 'SUB-0007',
    total: 45200.0,
    status: 'Overdue',
    daysOverdue: 6,
    dueDate: '2026-03-25',
    createdAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'inv_0044',
    invoiceNumber: 'INV-0044',
    customerName: 'Falcon Agro Corp',
    subscriptionId: 'SUB-0009',
    total: 28400.0,
    status: 'Overdue',
    daysOverdue: 14,
    dueDate: '2026-03-17',
    createdAt: '2026-03-02T09:00:00Z',
  },
  {
    id: 'inv_0045',
    invoiceNumber: 'INV-0045',
    customerName: 'UrbanCraft Interiors',
    subscriptionId: 'SUB-0012',
    total: 18600.0,
    status: 'Overdue',
    daysOverdue: 21,
    dueDate: '2026-03-10',
    createdAt: '2026-02-24T09:00:00Z',
  },
  {
    id: 'inv_0046',
    invoiceNumber: 'INV-0046',
    customerName: 'Kavita Textiles',
    subscriptionId: 'SUB-0005',
    total: 34100.0,
    status: 'Overdue',
    daysOverdue: 4,
    dueDate: '2026-03-27',
    createdAt: '2026-03-13T09:00:00Z',
  },
  {
    id: 'inv_0047',
    invoiceNumber: 'INV-0047',
    customerName: 'Zenith Logistics',
    subscriptionId: 'SUB-0002',
    total: 62000.0,
    status: 'Overdue',
    daysOverdue: 11,
    dueDate: '2026-03-20',
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'inv_0048',
    invoiceNumber: 'INV-0048',
    customerName: 'Apex Retailers',
    subscriptionId: 'SUB-0004',
    total: 12500.0,
    status: 'Overdue',
    daysOverdue: 18,
    dueDate: '2026-03-13',
    createdAt: '2026-02-27T09:00:00Z',
  },
  {
    id: 'inv_0049',
    invoiceNumber: 'INV-0049',
    customerName: 'Starlight Media',
    subscriptionId: 'SUB-0008',
    total: 51000.0,
    status: 'Overdue',
    daysOverdue: 3,
    dueDate: '2026-03-28',
    createdAt: '2026-03-14T09:00:00Z',
  },
  {
    id: 'inv_0050',
    invoiceNumber: 'INV-0050',
    customerName: 'Elevate EdTech',
    subscriptionId: 'SUB-0010',
    total: 73800.0,
    status: 'Overdue',
    daysOverdue: 9,
    dueDate: '2026-03-22',
    createdAt: '2026-03-07T09:00:00Z',
  },
  // Paid Invoices
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `inv_paid_${i + 1}`,
    invoiceNumber: `INV-${String(i + 10).padStart(4, '0')}`,
    customerName: mockCustomers[i % mockCustomers.length].name,
    subscriptionId: `SUB-${String(i + 1).padStart(4, '0')}`,
    total: 18500 + i * 4200,
    status: 'Paid',
    paymentMethod: i % 2 === 0 ? 'UPI' : 'Bank Transfer',
    dueDate: '2026-03-15',
    paidAt: '2026-03-14T11:00:00Z',
    createdAt: '2026-03-01T09:00:00Z',
  })),
];

// Payments records
export const mockPayments = mockInvoices
  .filter((inv) => inv.status === 'Paid')
  .map((inv, idx) => ({
    id: `pay_${idx + 1}`,
    paymentNumber: `PAY-${String(idx + 1).padStart(4, '0')}`,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    amount: inv.total,
    method: inv.paymentMethod || 'UPI',
    status: 'Success',
    date: inv.paidAt || '2026-03-14T11:00:00Z',
    transactionRef: `UPI-${Date.now().toString().slice(-8)}-${idx}`,
  }));

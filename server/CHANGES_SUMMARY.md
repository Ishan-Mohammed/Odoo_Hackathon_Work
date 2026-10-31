# BACKEND CHANGES SUMMARY

## 1. WHAT CHANGED

The backend is built as an Express and Node.js REST API with a PostgreSQL database layer, organized under the `server/` directory. Below is the complete manifest of all files created or modified under `server/`:

| Full File Path | Purpose |
|---|---|
| `server/package.json` | Node project manifest defining backend dependencies (`express`, `cors`, `dotenv`, `pg`, `bcryptjs`, `jsonwebtoken`) and execution scripts (`dev`, `start`, `test:*`, `db:setup`, `db:seed`). |
| `server/package-lock.json` | Exact dependency lockfile ensuring deterministic installs across environments. |
| `server/.env.example` | Template file documenting necessary backend configuration keys (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`) without storing secrets. |
| `server/index.js` | Main Express server entry point configuring CORS, JSON parsing, health checks, route mounting, 404 handler, and global error handling. |
| `server/middleware/auth.js` | JWT verification middleware (`verifyToken`) and role-based access control middleware (`requireRole`). |
| `server/db/index.js` | PostgreSQL connection pool initialization using `pg.Pool` with connection credentials from environment variables. |
| `server/db/run-sql.js` | Command-line database migration utility to execute `.sql` script files directly against PostgreSQL. |
| `server/db/schema.sql` | Relational schema definitions creating 13 database tables, enums, triggers, and indexes. |
| `server/db/seed.sql` | Seed script providing initial demo data for users, catalog products, variants, plans, taxes, discounts, quotation templates, subscriptions, invoices, and payments. |
| `server/services/billingService.js` | Recurring billing engine handling due subscription identification, line-item calculation, discount logic, tax computation, idempotent invoice creation, and subscription date progression. |
| `server/controllers/authController.js` | Authentication request handlers for user login, customer registration, password reset token issuance, password updates, and token verification. |
| `server/controllers/billingController.js` | Handlers exposing dry-run billing previews and actual invoice generation runs. |
| `server/controllers/invoiceController.js` | Handlers for paginated invoice listings, detailed invoice retrieval (with lines and payment history), invoice confirmation, and invoice cancellation. |
| `server/controllers/paymentController.js` | Handlers for recording payments with transaction locks, overpayment prevention, invoice status updates, and paginated payment history. |
| `server/controllers/dashboardController.js` | Handlers running SQL aggregate queries for executive dashboard KPIs, 12-month revenue trends, invoice status breakdown, overdue invoice listing, payment reminders, and report summaries. |
| `server/controllers/portalController.js` | Handlers serving customer-scoped portal metrics, customer subscriptions, and customer invoice history. |
| `server/controllers/subscriptionController.js` | Handlers for subscription listing, creation (from catalog lines or quotation templates), detail views, real-time price calculation previews, and lifecycle state-machine transitions. |
| `server/controllers/catalogController.js` | Handlers providing paginated read-only catalog listings for customers, products with variants, subscription plans, taxes, discounts, and quotation templates. |
| `server/routes/auth.js` | Express route bindings for `/api/auth` authentication endpoints. |
| `server/routes/staff.js` | Express route bindings for `/api/staff` admin-only employee management endpoints. |
| `server/routes/billing.js` | Express route bindings for `/api/billing` recurring billing preview and run endpoints. |
| `server/routes/invoices.js` | Express route bindings for `/api/invoices` lifecycle, overdue, and reminder endpoints. |
| `server/routes/payments.js` | Express route bindings for `/api/payments` recording and listing endpoints. |
| `server/routes/dashboard.js` | Express route bindings for `/api/dashboard` executive KPI analytics. |
| `server/routes/reports.js` | Express route bindings for `/api/reports` reporting summary data. |
| `server/routes/portal.js` | Express route bindings for `/api/portal` customer self-service endpoints. |
| `server/routes/subscriptions.js` | Express route bindings for `/api/subscriptions` subscription management, lifecycle updates, and price preview. |
| `server/routes/customers.js` | Express route bindings for `/api/customers` directory and detail endpoints. |
| `server/routes/products.js` | Express route bindings for `/api/products` catalog endpoints. |
| `server/routes/plans.js` | Express route bindings for `/api/plans` subscription plan endpoints. |
| `server/routes/taxes.js` | Express route bindings for `/api/taxes` tax definition endpoints. |
| `server/routes/discounts.js` | Express route bindings for `/api/discounts` coupon and discount rule endpoints. |
| `server/routes/quotationTemplates.js` | Express route bindings for `/api/quotation-templates` quotation template endpoints. |
| `server/test/billing.test.js` | Automated integration tests for the billing calculation engine, dry-run preview, and duplicate billing prevention. |
| `server/test/api1.test.js` | Automated integration tests for authentication, dashboard metrics, overdue invoices, and customer portal endpoints. |
| `server/test/api2.test.js` | Automated integration tests for subscription lifecycle state transitions, price calculations, and catalog listings. |

---

## 2. ENDPOINTS

Below is the complete inventory of all routes exposed by the backend:

| METHOD | PATH | Who can call it | Request body / params / query | Response fields | Error shapes |
|---|---|---|---|---|---|
| `GET` | `/health` | Public / Anyone | None | `{ ok: true }` | `500 { error: string }` |
| `GET` | `/api/health` | Public / Anyone | None | `{ ok: true }` | `500 { error: string }` |
| `GET` | `/api/admin/ping` | `admin` | Headers: `Authorization: Bearer <token>` | `{ ok: true }` | `401 { error: string }`<br>`403 { error: string }` |
| `POST` | `/api/auth/login` | Public | Body: `{ email, password }` | `{ token: string, user: { id, name, email, role } }` | `400 { error: 'Email and password are required.' }`<br>`401 { error: 'Invalid email or password' }` |
| `POST` | `/api/auth/signup` | Public | Body: `{ name, email, password }` | `201 { token: string, user: { id, name, email, role } }` | `400 { error: string }`<br>`409 { error: 'Email already registered' }` |
| `POST` | `/api/auth/forgot-password` | Public | Body: `{ email }` | `{ success: true, message: string }` | None (generic success returned on all input) |
| `POST` | `/api/auth/reset-password` | Public | Body: `{ token, password }` | `{ success: true, message: string }` | `400 { error: 'Reset token is required.' }`<br>`400 { error: 'New password is required.' }`<br>`400 { error: 'This link has expired' }`<br>`400 { error: string }` |
| `POST` | `/api/auth/reset-password/:token` | Public | Params: `token`<br>Body: `{ password }` | `{ success: true, message: string }` | Same as `/api/auth/reset-password` |
| `GET` | `/api/auth/me` | Authenticated (`admin`, `staff`, `customer`) | Headers: `Authorization: Bearer <token>` | `{ user: { id, name, email, role, created_at } }` | `401 { error: string }`<br>`404 { error: 'User not found.' }` |
| `GET` | `/api/staff` | `admin` | Headers: `Authorization: Bearer <token>` | `{ staff: [{ id, name, email, role, created_at }] }` | `401 { error: string }`<br>`403 { error: string }` |
| `POST` | `/api/staff` | `admin` | Body: `{ name, email, password }` | `201 { user: { id, name, email, role, created_at }, staff: { id, name, email, role, created_at } }` | `400 { error: string }`<br>`401 { error: string }`<br>`403 { error: string }`<br>`409 { error: 'Email already registered' }` |
| `GET` | `/api/dashboard` | `admin`, `staff` | Query: `preset`, `from`, `to`, `customerId`, `status` | `{ stats: { activeSubscriptions, revenue, revenueCollected, outstanding, overdueCount, overdueAmount }, revenueByMonth: [{ month, label, revenue }], statusBreakdown: [{ status, count }], overdueInvoices: [{ id, number, customerName, total, outstanding, dueDate, daysOverdue, isReminderSent }] }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/reports/summary` | `admin`, `staff` | Query: `preset`, `from`, `to`, `customerId`, `status` | `{ stats, revenueByMonth, statusBreakdown, overdueInvoices, filters: { preset, from, to, customerId, status } }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/invoices/overdue` | Authenticated | Query: `page`, `pageSize`, `customerId` | `{ data: [{ id, number, customerName, total, outstanding, dueDate, daysOverdue, isReminderSent }], page: number, pageSize: number, total: number }` | `401 { error: string }` |
| `GET` | `/api/invoices` | Authenticated (`admin`, `staff` see all; `customer` scoped to own) | Query: `page`, `pageSize`, `status`, `customerId`, `search`, `overdue`, `from`, `to`, `sortBy`, `sortDir` | `{ data: [{ id, number, invoiceNumber, subscriptionId, subscriptionNumber, customerId, customerName, periodStart, periodEnd, subtotal, discountTotal, taxTotal, total, paidAmount, outstanding, dueDate, status, rawStatus, daysOverdue, discountLabel, taxLabel, createdAt }], page: number, pageSize: number, total: number }` | `401 { error: string }` |
| `GET` | `/api/invoices/:id` | Authenticated (`admin`, `staff`, or owner `customer`) | Params: `id` (numeric ID or invoice number) | `{ ...invoiceRow, customer: { name, email, address }, subscription: { id, number }, lines: [{ id, description, qty, unitPrice, tax, taxLabel, amount }], payments: [{ id, invoiceId, invoiceNumber, customerName, method, amount, date, note }] }` | `401 { error: string }`<br>`404 { error: 'Invoice not found' }` |
| `PATCH` | `/api/invoices/:id/confirm` | `admin`, `staff` | Params: `id` | `{ ok: true, invoice: formattedInvoice }` | `400 { error: 'Only Draft invoices can be confirmed' }`<br>`401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Invoice not found' }` |
| `POST` | `/api/invoices/:id/confirm` | `admin`, `staff` | Params: `id` | `{ ok: true, invoice: formattedInvoice }` | Same as `PATCH /api/invoices/:id/confirm` |
| `PATCH` | `/api/invoices/:id/cancel` | `admin`, `staff` | Params: `id` | `{ ok: true, invoice: formattedInvoice }` | `400 { error: 'A Paid invoice cannot be cancelled' }`<br>`400 { error: 'Invoice is already cancelled' }`<br>`401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Invoice not found' }` |
| `POST` | `/api/invoices/:id/cancel` | `admin`, `staff` | Params: `id` | `{ ok: true, invoice: formattedInvoice }` | Same as `PATCH /api/invoices/:id/cancel` |
| `POST` | `/api/invoices/:id/remind` | `admin`, `staff` | Params: `id` | `{ ok: true, success: true, message: string }` | `400 { error: 'Invoice is already paid' }`<br>`400 { error: 'Cannot send reminder for a cancelled invoice' }`<br>`400 { error: 'Invoice is not overdue yet' }`<br>`401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Invoice not found' }` |
| `POST` | `/api/invoices/:id/reminder` | `admin`, `staff` | Params: `id` | `{ ok: true, success: true, message: string }` | Same as `/api/invoices/:id/remind` |
| `POST` | `/api/billing/preview` | `admin`, `staff` | None | `{ dryRun: true, dueCount: number, estimatedTotal: number, alreadyBilledCount: number, created: [], skipped: number, skippedDuplicates: number, failed: [] }` | `401 { error: string }`<br>`403 { error: string }` |
| `POST` | `/api/billing/run` | `admin`, `staff` | Body: `{ dryRun?: boolean }` | `{ dryRun: boolean, dueCount: number, estimatedTotal: number, alreadyBilledCount: number, created: [{ invoiceId, number, customerName, total }], skipped: number, skippedDuplicates: number, failed: [{ subscriptionNumber, reason }] }` | `401 { error: string }`<br>`403 { error: string }` |
| `POST` | `/api/payments` | Authenticated (`admin`, `staff`, or owner `customer`) | Body: `{ invoiceId, method: 'Cash'\|'Card'\|'UPI'\|'Bank', amount, date?, note? }` | `201 { ok: true, payment: { id, invoiceId, invoiceNumber, customerName, method, amount, date, note }, invoice: { id, number, status, total, paidAmount, outstanding } }` | `400 { error: string }` (invalid method, amount <= 0, overpayment, draft invoice, cancelled invoice, paid invoice)<br>`401 { error: string }`<br>`404 { error: 'Invoice not found' }` |
| `GET` | `/api/payments` | Authenticated (`admin`, `staff` see all; `customer` scoped to own) | Query: `page`, `pageSize`, `method`, `from`, `to`, `search` | `{ data: [{ id, invoiceId, invoiceNumber, customerName, method, amount, date, note }], page: number, pageSize: number, total: number }` | `401 { error: string }` |
| `GET` | `/api/subscriptions` | `admin`, `staff` | Query: `page`, `pageSize`, `status`, `customer`, `customerId`, `plan`, `planId`, `search` | `{ data: [{ id, number, subscriptionNumber, customerId, customerName, planId, planName, status, startDate, expiryDate, nextBillingDate, start_date, expiry_date, next_billing_date, amount }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/subscriptions/:id` | `admin`, `staff` | Params: `id` (numeric ID or subscription number) | `{ id, number, subscriptionNumber, customer: { id, name, email }, plan: { id, name, price, period, minQty, autoClose, closable, pausable, renewable }, paymentTerms, payment_terms, status, startDate, start_date, expiryDate, expiry_date, nextBillingDate, next_billing_date, createdAt, lines: [{ id, productId, productName, variantId, variantLabel, qty, unitPrice, taxRate, amount }], invoices: [{ id, number, period, periodStart, periodEnd, total, status, dueDate, due_date }], allowedActions: string[] }` | `401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Subscription not found' }` |
| `POST` | `/api/subscriptions` | `admin`, `staff` | Body: `{ customerId, planId?, templateId?, startDate?, expiryDate?, paymentTerms?, lines?: [{ productId, variantId?, qty }], qty? }` | `201 { ok: true, subscription: { id, number, customer_id, plan_id, start_date, expiry_date, payment_terms, status: 'Draft', next_billing_date: null } }` | `400 { error: string }` (missing customerId, missing planId, empty lines)<br>`401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Quotation template not found' }` |
| `PATCH` | `/api/subscriptions/:id/status` | `admin`, `staff` | Params: `id`<br>Body: `{ action: 'quote'\|'confirm'\|'activate'\|'pause'\|'resume'\|'close'\|'renew' }` (or `{ status: ... }`) | `{ ok: true, message: string, subscription: updatedSubscription }` | `400 { error: string }` (invalid status transition, plan disallows action)<br>`401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Subscription not found' }` |
| `POST` | `/api/subscriptions/price-preview` | `admin`, `staff` | Body: `{ lines: [{ productId, variantId?, qty }] }` | `{ subtotal: number, discount: number, discountTotal: number, tax: number, taxTotal: number, total: number, discountCode: string \| null }` | `400 { error: 'lines array is required' }`<br>`401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/customers` | `admin`, `staff` | Query: `page`, `pageSize`, `search` | `{ data: [{ id, name, email, createdAt, subscriptionCount, outstandingAmount }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/customers/:id` | `admin`, `staff` | Params: `id` | `{ id, name, email, createdAt, subscriptions: [...], invoices: [...], payments: [...] }` | `401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Customer not found' }` |
| `GET` | `/api/products` | `admin`, `staff` | Query: `page`, `pageSize` | `{ data: [{ id, name, type, salesPrice, costPrice, notes, variants: [{ id, attribute, value, extraPrice, unitPrice }] }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/plans` | `admin`, `staff` | Query: `page`, `pageSize` | `{ data: [{ id, name, price, period, minQty, validFrom, validTo, autoClose, closable, pausable, renewable, auto_close }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/taxes` | `admin`, `staff` | Query: `page`, `pageSize` | `{ data: [{ id, name, rate, appliesTo, applies_to }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/discounts` | `admin`, `staff` | Query: `page`, `pageSize` | `{ data: [{ id, code, type, value, minPurchase, minQty, startDate, endDate, usageLimit, usedCount, appliesTo, targetProductId, active }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/quotation-templates` | `admin`, `staff` | Query: `page`, `pageSize` | `{ data: [{ id, name, planId, validityDays, planName, lines: [{ id, productId, variantId, qty, productName, variantAttribute, variantValue, unitPrice }] }], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/portal/summary` | `customer` | Headers: `Authorization: Bearer <token>` | `{ amountOwed: number, overdueCount: number, activeSubscriptions: number, nextBillingDate: string \| null }` | `401 { error: string }`<br>`403 { error: 'Forbidden: insufficient permissions.' }` |
| `GET` | `/api/portal/subscriptions` | `customer` | Headers: `Authorization: Bearer <token>` | `{ data: [{ id, number, subscriptionNumber, customerId, planId, planName, billingPeriod, startDate, expiryDate, paymentTerms, status, nextBillingDate, createdAt, totalAmount, seats }], total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/portal/subscriptions/:id` | `customer` | Params: `id` | `{ id, subscriptionNumber, planName, billingPeriod, planPrice, startDate, expiryDate, nextBillingDate, paymentTerms, status, createdAt, lines: [{ id, productId, productName, variant, qty, unitPrice, taxLabel, amount }], invoices: [{ id, number, invoiceNumber, periodStart, periodEnd, subtotal, discountTotal, taxTotal, total, paidAmount, outstanding, dueDate, status, createdAt }] }` | `401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Subscription not found' }` |
| `GET` | `/api/portal/invoices` | `customer` | Query: `page`, `pageSize`, `status` | `{ data: [Invoice], page: number, pageSize: number, total: number }` | `401 { error: string }`<br>`403 { error: string }` |
| `GET` | `/api/portal/invoices/:id` | `customer` | Params: `id` | `{ ...invoiceRow, customer: { name, email, address }, subscription: { id, number }, lines: [...], payments: [...] }` | `401 { error: string }`<br>`403 { error: string }`<br>`404 { error: 'Invoice not found' }` |

---

## 3. HOW TO CONNECT THE FRONTEND

### Base URL
- The API base URL is: `http://localhost:5000/api`
- All backend routes are mounted under the `/api` prefix (with `/health` also available at the root).

### JWT Authentication Header
- Header Name: `Authorization`
- Format: `Bearer <jwt_token>`
- Token Storage: Stored in browser `localStorage` under the key `brightloop_token`. Handled transparently by the Axios interceptor in `src/api/axios.js`.

### CORS Origins
- Allowed Origins configured in `server/index.js`:
  1. `http://localhost:5173` (Vite development server)
  2. The URL specified in `process.env.CLIENT_URL` (if configured in `server/.env`)
  3. Non-browser callers (curl, tests, server-to-server) with no origin header.
- `credentials: true` is enabled.

### Root `.env` Configuration
To switch the Vite frontend from mock mode to the live backend, set the following environment variables in the project root `.env`:

```env
VITE_USE_MOCK=false
VITE_USE_REAL_AUTH=true
VITE_API_URL=http://localhost:5000/api
VITE_REAL_MODULES=auth,dashboard,invoices,payments,billing,subscriptions,customers,products,plans,taxes,discounts,quotation-templates,portal
```

---

## 4. MOCK VS REAL

Comparison of every function in `src/api/client.js` and `src/api/auth.js` against the corresponding backend implementation:

| Frontend Function | Backend Endpoint | Alignment / Shape Differences |
|---|---|---|
| `login({ email, password })` in `src/api/auth.js` | `POST /api/auth/login` | **Exact match**. Body: `{ email, password }`. Returns `{ token, user: { id, name, email, role } }`. |
| `signup({ name, email, password })` in `src/api/auth.js` | `POST /api/auth/signup` | **Exact match**. Body: `{ name, email, password }`. Enforces 9+ char password with uppercase, lowercase, and special symbol. Returns `201 { token, user: { id, name, email, role } }`. |
| `forgotPassword({ email })` in `src/api/auth.js` | `POST /api/auth/forgot-password` | **Exact match**. Returns `{ success: true, message: string }`. Persists reset token hash with 1-hour expiration in PostgreSQL. |
| `resetPassword({ token, password })` in `src/api/auth.js` | `POST /api/auth/reset-password/:token` and `POST /api/auth/reset-password` | **Exact match**. Accepts token in URL params or body. Returns `{ success: true, message: string }`. |
| `getDashboard(filters)` in `src/api/client.js` | `GET /api/dashboard` | **Exact match**. Returns `{ stats: { activeSubscriptions, revenue, revenueCollected, outstanding, overdueCount, overdueAmount }, revenueByMonth, statusBreakdown, overdueInvoices }`. Dual-provides `revenue` and `revenueCollected` to prevent frontend property mismatches. |
| `getOverdueInvoices(params)` in `src/api/client.js` | `GET /api/invoices/overdue` | **Exact match**. Returns `{ data, page, pageSize, total }` with `daysOverdue`, `isReminderSent`, `outstanding`, and customer details. |
| `sendReminder(invoiceId)` in `src/api/client.js` | `POST /api/invoices/:id/reminder` and `POST /api/invoices/:id/remind` | **Exact match**. Returns `{ ok: true, success: true, message }`. |
| `listSubscriptions(params)` in `src/api/client.js` | `GET /api/subscriptions` | **Exact match**. Returns `{ data: [Subscription], page, pageSize, total }`. Supports filters (`status`, `customer`/`customerId`, `plan`/`planId`, `search`). Dual-provides camelCase and snake_case date keys. |
| `listInvoices(params)` in `src/api/client.js` | `GET /api/invoices` | **Exact match**. Returns `{ data: [Invoice], page, pageSize, total }`. Computes `Overdue` status on-the-fly (`due_date < current_date` and unpaid). |
| `getInvoice(id)` in `src/api/client.js` | `GET /api/invoices/:id` | **Exact match**. Returns complete invoice record with `lines`, `payments`, `customer`, and `subscription` nested objects. |
| `runBilling({ dryRun })` in `src/api/client.js` | `POST /api/billing/run` and `POST /api/billing/preview` | **Exact match**. Dry-run generates estimated figures without writing; execution generates invoices, inserts line items, updates subscription billing dates, and returns `{ dryRun, dueCount, estimatedTotal, alreadyBilledCount, created, skipped, skippedDuplicates, failed }`. |
| `confirmInvoice(id)` in `src/api/client.js` | `POST /api/invoices/:id/confirm` and `PATCH /api/invoices/:id/confirm` | **Exact match**. Supports both `POST` (used in `client.js`) and `PATCH` methods. Returns `{ ok: true, invoice }`. |
| `cancelInvoice(id)` in `src/api/client.js` | `POST /api/invoices/:id/cancel` and `PATCH /api/invoices/:id/cancel` | **Exact match**. Supports both `POST` and `PATCH`. Returns `{ ok: true, invoice }`. |
| `sendInvoice(id)` in `src/api/client.js` | **NOT BUILT** | Frontend mock returned `{ ok: true, invoice }`. No email delivery route exists at `/api/invoices/:id/send`. |
| `recordPayment(body)` in `src/api/client.js` | `POST /api/payments` | **Exact match**. Body: `{ invoiceId, method, amount, date, note }`. Enforces row-level lock (`FOR UPDATE`), rejects overpayments, and marks invoice as `Paid` upon full coverage. Returns `{ ok: true, payment, invoice }`. |
| `listPayments(params)` in `src/api/client.js` | `GET /api/payments` | **Exact match**. Returns `{ data: [Payment], page, pageSize, total }`. Scoped by customer role when called by customer users. |
| `listCustomers(params)` in `src/api/client.js` | `GET /api/customers` | **Exact match**. Returns `{ data: [Customer], page, pageSize, total }` with computed `subscriptionCount` and `outstandingAmount`. |
| `listOpenInvoices(params)` in `src/api/client.js` | Replaced by `GET /api/invoices?status=Confirmed` | `client.js` line 668 targets `GET /invoices/open`. The backend filters open invoices via `GET /api/invoices?status=Confirmed`. |

---

## 5. STILL MOCKED

The following frontend functions have no corresponding backend endpoints:

1. **`sendInvoice(id)`**:
   - Located at `src/api/client.js` line 515.
   - Triggers `POST /invoices/:id/send`.
   - **Status**: **NOT BUILT**. The backend does not implement email sending for invoices, and no route handler exists for `POST /api/invoices/:id/send`.
2. **`listOpenInvoices({ search })`**:
   - Located at `src/api/client.js` line 652.
   - Triggers `GET /invoices/open`.
   - **Status**: **NOT BUILT as a standalone route**. Open invoices are retrieved using `GET /api/invoices?status=Confirmed`. Calling `/api/invoices/open` directly on the backend returns a 404 Route Not Found error.
3. **Catalog Mutation Endpoints**:
   - Creating, updating, or deleting products, plans, taxes, discounts, or quotation templates (`POST`, `PATCH`, `DELETE` on `/api/products`, `/api/plans`, etc.) are **NOT BUILT**. Only read-only `GET` listings and lookups were built.

---

## 6. RISKS

1. **Unimplemented Email Routes (`sendInvoice`)**:
   - Calling `sendInvoice(id)` when `VITE_USE_MOCK=false` causes an unhandled HTTP 404 error from Express. The frontend must retain mock handling for invoice emailing or add a backend stub route.
2. **Dedicated `/api/invoices/open` Route Missing**:
   - The payment modal uses `listOpenInvoices()` from `src/api/client.js`, which queries `/invoices/open`. With mocks disabled, this endpoint returns 404 unless `src/api/client.js` is modified to call `/invoices?status=Confirmed` or an alias route is added to `server/routes/invoices.js`.
3. **In-Memory Reminder State**:
   - `sentReminders` in `server/controllers/dashboardController.js` is kept in process memory (`Set`). If the Node process restarts, the `isReminderSent` boolean flag on overdue invoices resets to `false` because reminders are not stored in a persistent database table.
4. **Email Delivery Mocking in Password Reset**:
   - `POST /api/auth/forgot-password` generates and stores a secure SHA-256 hashed token with expiry in the database and logs the reset link to `console.log`. It does not send an actual email via SMTP/SES/SendGrid.
5. **Sequence Number Generation Concurrency**:
   - Sequence generation for invoices (`INV-YYYY-XXXX`) and subscriptions (`SUB-XXXX`) queries `MAX(SUBSTRING(...)::int) + 1`. Under high-concurrency burst conditions, two simultaneous creation requests could encounter unique constraint collisions on invoice/subscription numbers unless managed by PostgreSQL database sequences.

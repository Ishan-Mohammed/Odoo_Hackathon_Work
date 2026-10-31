# Brightloop Subscription Management System

> One platform to run plans, subscriptions and recurring billing: from product setup to invoices, payments and revenue reporting.

![Status](https://img.shields.io/badge/status-hackathon%20submission-6366f1)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20PostgreSQL-0ea5e9)
![Billing](https://img.shields.io/badge/billing-idempotent-10b981)

**Team:** `<TEAM NAME>` · **Hackathon:** `<Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026>` · **Round:*1* Virtual round
**Live demo:** `<DEPLOYED LINK>` · **Demo video:** `<VIDEO LINK>` · **Slides:** `<DECK LINK>`

---

## 1. The Problem

Brightloop Software sells everything on subscription: monthly and yearly software plans, switchable add-ons and product variants. Today the business runs on:

| Today | Consequence |
|---|---|
| Subscriptions in a spreadsheet | No single source of truth |
| Renewals remembered by whoever notices | Missed renewals, lost revenue |
| Invoices typed by hand | Wrong amounts, wrong taxes |
| Payments matched by scrolling bank statements | Slow, error-prone collections |
| Revenue reports built every quarter | Nobody knows the real recurring revenue |

## 2. Our Solution

A unified web platform that automates the **entire subscription lifecycle**:

```
Product → Plan → Quotation → Subscription → Invoice → Payment → Report
```

Every step of an ordinary billing month at Brightloop is covered: customer signup, plan launch, quote-to-subscription, billing day, discounts, payment collection, and month-end finance review.

---

## 3. Key Features

### Authentication and Roles
- Email and password signup with **unique email per account**
- Strong password rule: **more than 8 characters**, with an uppercase letter, a lowercase letter and a special character (regex-enforced on the backend)
- **Forgot password** with an expiring reset link sent to the registered email
- Three roles with **backend-enforced RBAC** (JWT + middleware, not just hidden buttons):

| Role | Access |
|---|---|
| **Admin** | Everything: products, variants, plans, taxes, discounts, staff creation, all reports |
| **Internal Staff** | Day-to-day: quotes, subscriptions, billing runs, payments, invoices. Cannot change products, plans, taxes, discounts or staff |
| **Customer** | Portal only: sees **only their own** subscriptions and invoices |

### Products, Variants and Plans
- Products with name, type, sales price, cost price and notes
- **Variants** with extra price (for example *Brand = Odoo adds 560*), so `unit price = base + variant extra`
- Plans with daily / weekly / monthly / yearly billing, minimum quantity and availability dates
- **Per-plan admin toggles:** auto-close at end, closable early, pausable, renewable

### Quotations and Subscriptions
- **Quotation templates** (pre-filled plan and lines, valid for N days) convert into live subscriptions
- Auto-numbered subscriptions (`SUB-0001`) with customer, plan, start and expiry dates, payment terms and line items
- Visible lifecycle: **Draft → Quotation → Confirmed → Active → Closed** (plus Pause and Renew where the plan allows). Illegal transitions are rejected

### Automated Invoicing
- Invoices generated **from the subscription** with customer details, lines, taxes and totals pre-filled
- **Run Billing** with a **dry-run preview** (how many are due, estimated total, how many already billed), then execution, then a result summary (created / skipped / failed)
- A **daily cron job** bills all due subscriptions automatically
- Taxes computed from admin-defined tax rules
- Invoice actions: Confirm, Cancel, Send (email with PDF), Print (PDF). Lifecycle: **Draft → Confirmed → Paid**
- **Nothing is billed twice or skipped** (see Engineering Highlights)

### Discounts
- Admin-only rules: **fixed or percentage**, minimum purchase or quantity, start/end dates, usage limit
- Apply to **specific products or whole subscriptions**
- **Auto-applied** on the next invoice, and automatically stop when expired or when the usage limit is reached

### Payments
- Record method (Cash / Card / UPI / Bank), amount, date and note against the right invoice
- Invoice flips to **Paid** automatically when payments cover the total
- Always-visible split of paid vs outstanding, with **overdue** invoices flagged with days late

### Finance Dashboard
- One page showing **Active Subscriptions, Revenue Collected, Outstanding Amount, Overdue Invoices**
- Revenue by month chart, invoice status breakdown, overdue table with reminders
- Filters by date range, customer and status
- Every page targets **under 2 seconds** with thousands of subscriptions

---

## 4. Worked Example (included as seed data)

| Step | Detail |
|---|---|
| Product | Brightloop CRM, base price 2,000 |
| Variant | Brand: Odoo, +560, so unit price is **2,560** |
| Plan | CRM Monthly (monthly billing, min qty 1) |
| Customer | Acme Traders, 5 seats |
| Subtotal | 5 × 2,560 = **12,800.00** |
| Discount BULK10 | 10% for 5 or more seats = **−1,280.00** |
| Taxable amount | **11,520.00** |
| GST 18% | **2,073.60** |
| **Invoice total** | **13,593.60** |
| Payment | UPI 13,593.60, so the invoice becomes **Paid** |
| Re-run billing | Same period creates **0 duplicate invoices** |

---

## 5. Architecture

```mermaid
flowchart LR
    subgraph Client["React + Tailwind (Vite)"]
        A[Admin / Staff App]
        B[Customer Portal]
    end
    subgraph Server["Node.js + Express"]
        C[JWT Auth + RBAC middleware]
        D[Controllers]
        E[Billing Service]
        F[node-cron Scheduler]
        G[PDF + Email]
    end
    H[(PostgreSQL)]
    A --> C
    B --> C
    C --> D
    D --> E
    F --> E
    D --> G
    D --> H
    E --> H
```

### Billing flow

```mermaid
flowchart TD
    S[Active subscription due: next_billing_date <= today] --> T[Begin transaction]
    T --> L[Build lines: qty × unit price incl. variant]
    L --> DS[Apply eligible discount: dates, limits, min qty]
    DS --> TX[Compute tax from tax rules]
    TX --> I[INSERT invoice ON CONFLICT DO NOTHING]
    I -->|inserted| U[Increment discount used_count + advance next_billing_date]
    I -->|already exists| K[Skip: counted as duplicate-skipped]
    U --> C[Commit]
```

### Subscription lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Quotation
    Quotation --> Confirmed
    Confirmed --> Active
    Active --> Paused: if plan is pausable
    Paused --> Active
    Active --> Closed: if closable or auto-close
    Closed --> Active: renew, if plan is renewable
```

---

## 6. Engineering Highlights

| Concern | How we handled it |
|---|---|
| **No double billing** | `UNIQUE(subscription_id, period_start)` on invoices, plus `INSERT ... ON CONFLICT DO NOTHING` inside a transaction. Re-running billing is always safe |
| **No skipped billing** | The dry-run preview and the cron job both select on `status = 'Active' AND next_billing_date <= today`, and `next_billing_date` advances only after a successful insert |
| **Money correctness** | Discount usage count, invoice creation and billing date advance happen in **one transaction**. Payments also mark invoices Paid in a transaction, and overpayment or payment on cancelled invoices is rejected |
| **Security** | JWT auth, bcrypt password hashing, role middleware on every protected route, parameterized SQL only, customers' data filtered in SQL by the `customer_id` from the token (never from request params) |
| **Performance** | Raw SQL with a connection pool, aggregate queries (`SUM`, `COUNT`, `GROUP BY`) instead of loops, pagination, and indexes on `subscriptions(status, next_billing_date, customer_id)`, `invoices(status, due_date, subscription_id)`, `payments(invoice_id, date)` |
| **Overdue logic** | `due_date < today AND status NOT IN ('Paid', 'Cancelled')`, computed in SQL |

**Performance results** (2,500+ seeded subscriptions):

| Endpoint | Response time |
|---|---|
| Dashboard metrics | `<fill after running>` ms |
| Invoice list (paginated) | `<fill>` ms |
| Subscription list (paginated) | `<fill>` ms |
| Run Billing (preview) | `<fill>` ms |

---

## 7. UI / UX

The interface is designed around the billing workflow, not a generic admin template:

- **Run Billing** is the hero action: preview, confirm, then a result summary
- **Status stepper** on every subscription, showing only the valid next actions (with tooltips for disabled ones)
- **Invoice detail** styled like a real printable invoice, with a sticky action bar and a **Record Payment** drawer pre-filled with the outstanding amount
- **Live price summary** when creating a subscription from a template (subtotal, discount, tax, total)
- Consistent status colors, INR formatting (`en-IN`), skeleton loaders, empty and error states, toasts and confirm dialogs
- A lighter, simpler **customer portal** with a "You owe" banner
- One-click demo login chips on the login page

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Recharts, lucide-react, react-hot-toast |
| Backend | Node.js, Express |
| Database | PostgreSQL (raw SQL via `pg` connection pool) |
| Auth | JWT, bcrypt |
| Email / PDF | Nodemailer, PDFKit |
| Scheduling | node-cron |

---

## 9. Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone
```bash
git clone <YOUR_REPO_URL>
cd brightloop
```

### 2. Configure environment
Create `server/.env` (see `server/.env.example`):

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/brightloop
JWT_SECRET=change_me
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173

# Optional: if SMTP is not set, emails (reset links, invoices) are logged to the console
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Install and set up the database
```bash
cd server
npm install
npm run db:setup     # creates tables, constraints and indexes
npm run db:seed      # demo users, catalog, worked example, 2,500+ subscriptions
```

### 4. Run
```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm install && npm run dev
```
Open **http://localhost:5173**

---

## 10. Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@brightloop.com` | `<ADMIN_PASSWORD>` |
| Staff | `staff@brightloop.com` | `<STAFF_PASSWORD>` |
| Customer | `customer@acme.com` | `<CUSTOMER_PASSWORD>` |

The login page also has one-click chips for each role.

---

## 11. Suggested Demo Walkthrough (about 4 minutes)

1. **Login as Admin** and show the dashboard (active subscriptions, revenue, outstanding, overdue).
2. **Create** a product with the Odoo variant (+560), a plan, and the BULK10 discount.
3. **Login as Staff**, create a subscription for Acme Traders from a quotation template (5 seats), and move it through Draft → Active.
4. **Run Billing**: preview, confirm, and see the invoice total **13,593.60** with discount and GST applied automatically.
5. **Run Billing again** and show **0 duplicates created**.
6. **Record a UPI payment** and watch the invoice flip to **Paid** and the dashboard update.
7. Show an **overdue invoice** with its days-late indicator.
8. **Login as Customer** and show that only their own subscriptions and invoices are visible.
9. Try an **admin-only action as Staff** to show the backend returns 403.

---

## 12. Project Structure

```
brightloop/
├── client/
│   └── src/
│       ├── pages/          auth, dashboard, products, plans, subscriptions,
│       │                   invoices, payments, discounts, taxes, portal
│       ├── components/     Sidebar, Topbar, StatusBadge, StatusStepper,
│       │                   DataTable, StatCard, MoneyText, Modal, Drawer
│       ├── context/        AuthContext (user + role)
│       └── api/            axios instance + API calls
└── server/
    ├── routes/             auth, products, plans, subscriptions, invoices,
    │                       payments, discounts, taxes, reports
    ├── controllers/
    ├── middleware/         auth.js (JWT), roleCheck.js (RBAC)
    ├── services/           billingService.js, discountService.js, taxService.js
    ├── jobs/               billingCron.js
    └── db/                 index.js, schema.sql, seed.js
```

---

## 13. Database Schema

```mermaid
erDiagram
    USERS ||--o{ SUBSCRIPTIONS : "customer"
    PLANS ||--o{ SUBSCRIPTIONS : "billed on"
    SUBSCRIPTIONS ||--o{ SUBSCRIPTION_LINES : has
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCTS ||--o{ SUBSCRIPTION_LINES : "sold as"
    TAXES ||--o{ SUBSCRIPTION_LINES : "applied to"
    SUBSCRIPTIONS ||--o{ INVOICES : generates
    INVOICES ||--o{ INVOICE_LINES : has
    INVOICES ||--o{ PAYMENTS : "settled by"
    PLANS ||--o{ QUOTATION_TEMPLATES : "used in"
    QUOTATION_TEMPLATES ||--o{ QUOTATION_TEMPLATE_LINES : has
    DISCOUNTS }o--o| PRODUCTS : "targets"
```

Key constraint: `UNIQUE(subscription_id, period_start)` on `invoices`.

---

## 14. API Overview

| Area | Examples | Access |
|---|---|---|
| Auth | `POST /auth/signup`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | Public |
| Catalog | `/products`, `/variants`, `/plans`, `/taxes`, `/discounts` | Admin (write), Staff (read) |
| Staff | `POST /staff` | Admin only |
| Subscriptions | `/subscriptions`, `/subscriptions/:id/transition` | Admin, Staff (customer: own, read only) |
| Templates | `/quotation-templates`, `/quotation-templates/:id/convert` | Admin, Staff |
| Billing | `POST /billing/preview`, `POST /billing/run` | Admin, Staff |
| Invoices | `/invoices`, `/invoices/:id/confirm`, `/cancel`, `/send`, `/pdf` | Admin, Staff (customer: own, read only) |
| Payments | `POST /payments`, `GET /payments` | Admin, Staff |
| Reports | `/reports/summary`, `/reports/revenue-by-month`, `/reports/overdue` | Admin, Staff |

> Exact routes are in `server/routes/`.

---

## 15. Assumptions

- **Overdue** means the due date has passed and the invoice is not Paid or Cancelled.
- Due date = invoice date + the subscription's payment terms (for example Net 15).
- Discounts apply automatically when conditions (minimum quantity or purchase, dates, usage limit) are met.
- Only subscriptions with status **Active** are billed.
- Currency is INR, formatted with the `en-IN` locale.

## 16. Future Scope

- Payment gateway integration (Razorpay or Stripe) with webhook-based reconciliation
- Automated dunning (reminder emails before and after the due date)
- Proration for mid-cycle upgrades and downgrades
- Usage-based billing and add-on metering
- MRR, churn and cohort analytics
- Multi-currency and multi-tax-region support

---

## 17. Screenshots

| Dashboard | Run Billing |
|---|---|
| `![Dashboard](docs/dashboard.png)` | `![Run Billing](docs/run-billing.png)` |

| Invoice | Customer Portal |
|---|---|
| `![Invoice](docs/invoice.png)` | `![Portal](docs/portal.png)` |

---

## 18. Team

| Name | Role |
|---|---|
| `<Name>` | `<Role>` |

Built for **`<HACKATHON NAME>`** by **`<TEAM NAME>`**.

## 19. License

MIT

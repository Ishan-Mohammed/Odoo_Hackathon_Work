-- Brightloop Subscription Management: schema (PostgreSQL / Neon)
-- WARNING: drops and recreates every table. Safe for a fresh demo DB only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS payments, invoice_lines, invoices, subscription_lines, subscriptions,
  quotation_template_lines, quotation_templates, discounts, taxes, plans,
  product_variants, products, users CASCADE;
DROP SEQUENCE IF EXISTS invoice_seq;
CREATE SEQUENCE invoice_seq START 1;   -- used for invoice numbers: INV-00001

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','staff','customer')),
  reset_token   TEXT,
  reset_expiry  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  type        VARCHAR(60)  NOT NULL DEFAULT 'Software',
  sales_price NUMERIC(12,2) NOT NULL CHECK (sales_price >= 0),
  cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  notes       TEXT
);

CREATE TABLE product_variants (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute   VARCHAR(80) NOT NULL,
  value       VARCHAR(80) NOT NULL,
  extra_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE plans (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  period      VARCHAR(10) NOT NULL CHECK (period IN ('daily','weekly','monthly','yearly')),
  min_qty     INT NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  valid_from  DATE,
  valid_to    DATE,
  auto_close  BOOLEAN NOT NULL DEFAULT false,
  closable    BOOLEAN NOT NULL DEFAULT true,
  pausable    BOOLEAN NOT NULL DEFAULT false,
  renewable   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE taxes (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(80) NOT NULL,
  rate       NUMERIC(5,2) NOT NULL CHECK (rate >= 0),
  applies_to VARCHAR(40) NOT NULL DEFAULT 'all'
);

CREATE TABLE discounts (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(40) NOT NULL UNIQUE,
  type              VARCHAR(12) NOT NULL CHECK (type IN ('fixed','percentage')),
  value             NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  min_purchase      NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_qty           INT NOT NULL DEFAULT 0,
  start_date        DATE,
  end_date          DATE,
  usage_limit       INT,
  used_count        INT NOT NULL DEFAULT 0,
  applies_to        VARCHAR(20) NOT NULL DEFAULT 'subscription' CHECK (applies_to IN ('product','subscription')),
  target_product_id INT REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE quotation_templates (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(160) NOT NULL,
  plan_id       INT REFERENCES plans(id) ON DELETE SET NULL,
  validity_days INT NOT NULL DEFAULT 30
);

CREATE TABLE quotation_template_lines (
  id          SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  variant_id  INT REFERENCES product_variants(id),
  qty         INT NOT NULL DEFAULT 1 CHECK (qty >= 1)
);

CREATE TABLE subscriptions (
  id                SERIAL PRIMARY KEY,
  number            VARCHAR(20) NOT NULL UNIQUE,
  customer_id       INT NOT NULL REFERENCES users(id),
  plan_id           INT NOT NULL REFERENCES plans(id),
  start_date        DATE NOT NULL,
  expiry_date       DATE,
  payment_terms     VARCHAR(30) NOT NULL DEFAULT 'Net 15',
  status            VARCHAR(12) NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Quotation','Confirmed','Active','Paused','Closed')),
  next_billing_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_lines (
  id              SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id      INT NOT NULL REFERENCES products(id),
  variant_id      INT REFERENCES product_variants(id),
  qty             INT NOT NULL CHECK (qty >= 1),
  unit_price      NUMERIC(12,2) NOT NULL,
  tax_id          INT REFERENCES taxes(id)
);

CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  number          VARCHAR(20) NOT NULL UNIQUE,
  subscription_id INT NOT NULL REFERENCES subscriptions(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date        DATE NOT NULL,
  status          VARCHAR(12) NOT NULL DEFAULT 'Draft'
                  CHECK (status IN ('Draft','Confirmed','Paid','Cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_subscription_period UNIQUE (subscription_id, period_start)  -- no double billing
);

CREATE TABLE invoice_lines (
  id          SERIAL PRIMARY KEY,
  invoice_id  INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty         INT NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,
  tax         NUMERIC(5,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(12,2) NOT NULL
);

CREATE TABLE payments (
  id         SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  method     VARCHAR(10) NOT NULL CHECK (method IN ('Cash','Card','UPI','Bank')),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date       DATE NOT NULL DEFAULT current_date,
  note       TEXT
);

-- Indexes for fast dashboards and billing runs
CREATE INDEX idx_subs_status_billing_customer ON subscriptions (status, next_billing_date, customer_id);
CREATE INDEX idx_subs_customer               ON subscriptions (customer_id);
CREATE INDEX idx_invoices_status_due_sub     ON invoices (status, due_date, subscription_id);
CREATE INDEX idx_invoices_period             ON invoices (period_start);
CREATE INDEX idx_payments_invoice_date       ON payments (invoice_id, date);
CREATE INDEX idx_sublines_subscription       ON subscription_lines (subscription_id);
CREATE INDEX idx_invlines_invoice            ON invoice_lines (invoice_id);

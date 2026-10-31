-- Brightloop seed data. Run AFTER schema.sql on a fresh schema (ids start at 1).
-- DEMO PASSWORD for all demo users: Demo@12345  (change it below to match your frontend's demo constant)

-- ---------- USERS ----------
INSERT INTO users (name, email, password_hash, role) VALUES
 ('Admin User',   'admin@brightloop.com', crypt('Demo@12345', gen_salt('bf', 10)), 'admin'),
 ('Staff User',   'staff@brightloop.com', crypt('Demo@12345', gen_salt('bf', 10)), 'staff'),
 ('Acme Traders', 'customer@acme.com',    crypt('Demo@12345', gen_salt('bf', 10)), 'customer');
-- ids: admin=1, staff=2, Acme=3

-- 50 extra demo customers (ids 4..53)
INSERT INTO users (name, email, password_hash, role)
SELECT (ARRAY['Zen Retail','Northwind Labs','Bluepeak Studio','Kerala Spice Co','Orbit Logistics',
              'Nimbus Cafe','Harbor Legal','Greenleaf Foods','Pixel Forge','Summit Fitness'])[1 + (n % 10)] || ' ' || n,
       'customer' || n || '@demo.com',
       (SELECT password_hash FROM users WHERE email = 'customer@acme.com'),
       'customer'
FROM generate_series(1, 50) AS n;

-- ---------- CATALOG ----------
INSERT INTO products (name, type, sales_price, cost_price, notes) VALUES
 ('Brightloop CRM',       'Software', 2000, 900, 'Core CRM, billed per seat'),
 ('Brightloop Analytics', 'Software', 1200, 500, 'Reporting add-on');

INSERT INTO product_variants (product_id, attribute, value, extra_price) VALUES
 (1, 'Brand',   'Odoo',     560),   -- variant id 1: 2000 + 560 = 2560
 (1, 'Brand',   'Standard', 0),
 (2, 'Edition', 'Pro',      300);

INSERT INTO plans (name, price, period, min_qty, valid_from, valid_to, auto_close, closable, pausable, renewable) VALUES
 ('CRM Monthly',       2000,  'monthly', 1, current_date - 365, current_date + 730, false, true, true,  true),
 ('CRM Yearly',        20000, 'yearly',  1, current_date - 365, current_date + 730, true,  true, false, true),
 ('Analytics Monthly', 1200,  'monthly', 1, current_date - 365, current_date + 730, false, true, true,  true);

INSERT INTO taxes (name, rate, applies_to) VALUES
 ('GST 18%', 18, 'all'),
 ('GST 5%',  5,  'all');

INSERT INTO discounts (code, type, value, min_purchase, min_qty, start_date, end_date, usage_limit, used_count, applies_to, target_product_id) VALUES
 ('BULK10',   'percentage', 10, 0, 5, current_date - 30,  current_date + 365, 100, 0,   'subscription', NULL),
 ('SPRING20', 'percentage', 20, 0, 0, current_date - 120, current_date - 10,  100, 100, 'subscription', NULL); -- expired demo

INSERT INTO quotation_templates (name, plan_id, validity_days) VALUES ('CRM Starter (5 seats)', 1, 30);
INSERT INTO quotation_template_lines (template_id, product_id, variant_id, qty) VALUES (1, 1, 1, 5);

-- ---------- WORKED EXAMPLE: Acme Traders, 5 seats, due for billing today ----------
INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status, next_billing_date)
VALUES ('SUB-0001', 3, 1, current_date, current_date + 365, 'Net 15', 'Active', current_date);

INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id)
VALUES (1, 1, 1, 5, 2560, 1);   -- 5 x 2,560 = 12,800 -> -10% BULK10 = 11,520 -> +18% GST = 13,593.60

-- ---------- 2,500 GENERATED SUBSCRIPTIONS ----------
INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status, next_billing_date)
SELECT 'SUB-' || lpad((n + 1)::text, 4, '0'),
       4 + (n % 50),
       1 + (n % 3),
       current_date - (30 + (n % 330)),
       current_date - (30 + (n % 330)) + 365,
       'Net 15',
       CASE n % 10 WHEN 0 THEN 'Draft' WHEN 1 THEN 'Quotation' WHEN 2 THEN 'Confirmed'
                   WHEN 8 THEN 'Paused' WHEN 9 THEN 'Closed' ELSE 'Active' END,
       CASE WHEN n % 10 IN (3,4,5,6,7) THEN            -- Active ones get a billing date
              CASE WHEN n % 20 = 3 THEN current_date            -- due today
                   WHEN n % 20 = 4 THEN current_date - 3        -- overdue to bill
                   ELSE current_date + 1 + (n % 27) END         -- upcoming
            ELSE NULL END
FROM generate_series(1, 2500) AS n;

INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id)
SELECT id,
       CASE WHEN id % 2 = 0 THEN 1 ELSE 2 END,
       CASE WHEN id % 2 = 0 AND id % 3 = 0 THEN 1 END,
       1 + (id % 6),
       CASE WHEN id % 2 = 0 THEN (CASE WHEN id % 3 = 0 THEN 2560 ELSE 2000 END) ELSE 1200 END,
       1
FROM subscriptions
WHERE id > 1;

-- ---------- INVOICE HISTORY (up to 12 months, mostly Paid, some overdue/cancelled) ----------
WITH s AS (
  SELECT sub.id AS sub_id, sub.start_date, l.qty, l.unit_price, (l.qty * l.unit_price) AS subtotal
  FROM subscriptions sub
  JOIN subscription_lines l ON l.subscription_id = sub.id
  WHERE sub.id > 1 AND sub.status IN ('Active', 'Closed', 'Paused')
),
b AS (
  SELECT s.*, k,
         (date_trunc('month', current_date) - make_interval(months => k))::date AS period_start
  FROM s CROSS JOIN generate_series(1, 12) AS k
),
c AS (
  SELECT *, CASE WHEN qty >= 5 THEN round(subtotal * 0.10, 2) ELSE 0 END AS disc
  FROM b
  WHERE start_date <= period_start
)
INSERT INTO invoices (number, subscription_id, period_start, period_end, subtotal, discount_total, tax_total, total, due_date, status)
SELECT 'INV-' || lpad(nextval('invoice_seq')::text, 5, '0'),
       sub_id,
       period_start,
       (period_start + interval '1 month' - interval '1 day')::date,
       subtotal,
       disc,
       round((subtotal - disc) * 0.18, 2),
       (subtotal - disc) + round((subtotal - disc) * 0.18, 2),
       period_start + 15,
       CASE WHEN k = 1 AND sub_id % 4  = 0 THEN 'Confirmed'   -- unpaid, now overdue
            WHEN k = 2 AND sub_id % 25 = 0 THEN 'Confirmed'   -- long overdue
            WHEN k = 3 AND sub_id % 40 = 0 THEN 'Cancelled'
            ELSE 'Paid' END
FROM c;

INSERT INTO invoice_lines (invoice_id, description, qty, unit_price, tax, amount)
SELECT i.id, 'Brightloop subscription charge', l.qty, l.unit_price, 18, l.qty * l.unit_price
FROM invoices i
JOIN subscription_lines l ON l.subscription_id = i.subscription_id;

INSERT INTO payments (invoice_id, method, amount, date, note)
SELECT id,
       (ARRAY['Cash','Card','UPI','Bank'])[1 + (id % 4)],
       total,
       LEAST(due_date - (id % 10), current_date),
       'Seeded payment'
FROM invoices
WHERE status = 'Paid';

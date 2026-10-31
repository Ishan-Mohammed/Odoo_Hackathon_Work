import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import ProtectedRoute from './ProtectedRoute';
import AdminOnlyRoute from './AdminOnlyRoute';

// Layout Shells
import AppShell from '../components/layout/AppShell';
import PortalShell from '../components/layout/PortalShell';

// Public Auth Pages (Untouched)
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Dashboard, Placeholder Pages & Dev Showcase
import DashboardPage from '../pages/DashboardPage';
import GenericPlaceholderPage from '../pages/GenericPlaceholderPage';
import DevComponentsPage from '../pages/DevComponentsPage';
import NotFound from '../pages/NotFound';

// Invoices & Payments (live pages)
import InvoicesPage from '../pages/invoices/InvoicesPage';
import InvoiceDetailPage from '../pages/invoices/InvoiceDetailPage';
import PaymentsPage from '../pages/payments/PaymentsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ========================================================= */}
      {/* PUBLIC AUTH ROUTES (Guest Only)                           */}
      {/* ========================================================= */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* ========================================================= */}
      {/* LOGGED-IN APP SHELL (Admin & Staff)                       */}
      {/* ========================================================= */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/customers"
          element={
            <GenericPlaceholderPage
              title="Customers"
              subtitle="Manage accounts, contact details, and customer billing profiles"
            />
          }
        />
        <Route
          path="/customers/:id"
          element={
            <GenericPlaceholderPage
              title="Customer Details"
              subtitle="Customer profile, subscription history, and payment methods"
              breadcrumb={[{ label: 'Customers', href: '/customers' }, { label: 'Details' }]}
            />
          }
        />
        <Route
          path="/products"
          element={
            <GenericPlaceholderPage
              title="Products"
              subtitle="Product catalog, recurring services, and add-on variants"
            />
          }
        />
        <Route
          path="/plans"
          element={
            <GenericPlaceholderPage
              title="Plans"
              subtitle="Recurring billing frequencies, pricing tiers, and terms"
            />
          }
        />
        <Route
          path="/quotation-templates"
          element={
            <GenericPlaceholderPage
              title="Quotation Templates"
              subtitle="Predefined quotation structures for rapid customer sales"
            />
          }
        />
        <Route
          path="/subscriptions"
          element={
            <GenericPlaceholderPage
              title="Subscriptions"
              subtitle="Manage active, paused, confirmed, and draft subscriptions"
            />
          }
        />
        <Route
          path="/subscriptions/new"
          element={
            <GenericPlaceholderPage
              title="New Subscription"
              subtitle="Configure recurring order, select customer, and apply discounts"
              breadcrumb={[{ label: 'Subscriptions', href: '/subscriptions' }, { label: 'New' }]}
            />
          }
        />
        <Route
          path="/subscriptions/:id"
          element={
            <GenericPlaceholderPage
              title="Subscription Details"
              subtitle="Subscription status, prorations, renewals, and actions"
              breadcrumb={[{ label: 'Subscriptions', href: '/subscriptions' }, { label: 'Details' }]}
            />
          }
        />
        <Route path="/invoices"    element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/payments"     element={<PaymentsPage />} />
        <Route
          path="/reports"
          element={
            <GenericPlaceholderPage
              title="Reports"
              subtitle="MRR trends, churn analytics, and overdue collection reports"
            />
          }
        />

        {/* Admin-only Routes (Redirects Staff to /dashboard with toast) */}
        <Route
          path="/discounts"
          element={
            <AdminOnlyRoute>
              <GenericPlaceholderPage
                title="Discounts"
                subtitle="Manage discount codes, volume discounts, and promotion periods"
              />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/taxes"
          element={
            <AdminOnlyRoute>
              <GenericPlaceholderPage
                title="Taxes"
                subtitle="Configure GST rates, exemptions, and regional tax rules"
              />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <AdminOnlyRoute>
              <GenericPlaceholderPage
                title="Staff"
                subtitle="Team member accounts, roles, and administrative access"
              />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminOnlyRoute>
              <GenericPlaceholderPage
                title="Settings"
                subtitle="Company preferences, invoice numbering, and billing automation defaults"
              />
            </AdminOnlyRoute>
          }
        />

        {/* Hidden Dev Components Showcase */}
        <Route path="/dev/components" element={<DevComponentsPage />} />
      </Route>

      {/* ========================================================= */}
      {/* CUSTOMER PORTAL SHELL (Customer Role)                     */}
      {/* ========================================================= */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
            <PortalShell />
          </ProtectedRoute>
        }
      >
        <Route
          path="/portal"
          element={
            <GenericPlaceholderPage
              title="My Subscriptions"
              subtitle="Manage your active subscriptions, renewal dates, and seats"
            />
          }
        />
        <Route
          path="/portal/subscriptions/:id"
          element={
            <GenericPlaceholderPage
              title="Subscription Overview"
              subtitle="View plan details, usage, and seat allocations"
              breadcrumb={[{ label: 'My Subscriptions', href: '/portal' }, { label: 'Details' }]}
            />
          }
        />
        <Route
          path="/portal/invoices"
          element={
            <GenericPlaceholderPage
              title="My Invoices"
              subtitle="View invoice history, download PDF receipts, and verify payments"
            />
          }
        />
        <Route
          path="/portal/invoices/:id"
          element={
            <GenericPlaceholderPage
              title="Invoice Receipt"
              subtitle="View payment confirmation and itemized breakdown"
              breadcrumb={[{ label: 'My Invoices', href: '/portal/invoices' }, { label: 'Receipt' }]}
            />
          }
        />
      </Route>

      {/* Wildcard 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

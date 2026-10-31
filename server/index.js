require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { verifyToken, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const billingRoutes = require('./routes/billing');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const portalRoutes = require('./routes/portal');
const subscriptionRoutes = require('./routes/subscriptions');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const planRoutes = require('./routes/plans');
const taxRoutes = require('./routes/taxes');
const discountRoutes = require('./routes/discounts');
const quotationTemplateRoutes = require('./routes/quotationTemplates');

const app = express();

// CORS configuration
const allowedOrigins = ['http://localhost:5173'];
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// Health check endpoint (runs SELECT 1)
const healthHandler = async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/quotation-templates', quotationTemplateRoutes);

// Admin-only test route
app.get('/api/admin/ping', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ ok: true });
});

// JSON 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error('Server error:', err.message || err);
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

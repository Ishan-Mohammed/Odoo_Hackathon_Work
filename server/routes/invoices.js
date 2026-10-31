const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken, requireRole } = require('../middleware/auth');

const dashboardController = require('../controllers/dashboardController');

router.use(verifyToken);

// Overdue list (before /:id)
router.get('/overdue', dashboardController.getOverdueInvoices);

router.get('/', invoiceController.listInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Confirmation endpoints (support both PATCH and POST from client.js)
router.patch('/:id/confirm', requireRole('admin', 'staff'), invoiceController.confirmInvoice);
router.post('/:id/confirm', requireRole('admin', 'staff'), invoiceController.confirmInvoice);

// Cancellation endpoints (support both PATCH and POST from client.js)
router.patch('/:id/cancel', requireRole('admin', 'staff'), invoiceController.cancelInvoice);
router.post('/:id/cancel', requireRole('admin', 'staff'), invoiceController.cancelInvoice);

// Remind endpoints (support both /remind and /reminder)
router.post('/:id/remind', requireRole('admin', 'staff'), dashboardController.remindInvoice);
router.post('/:id/reminder', requireRole('admin', 'staff'), dashboardController.remindInvoice);

module.exports = router;

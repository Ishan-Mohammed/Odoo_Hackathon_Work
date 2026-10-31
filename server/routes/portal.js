const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Customer portal routes are strictly customer role only
router.use(verifyToken, requireRole('customer'));

router.get('/summary', portalController.getSummary);
router.get('/subscriptions', portalController.getSubscriptions);
router.get('/subscriptions/:id', portalController.getSubscriptionById);
router.get('/invoices', portalController.getInvoices);
router.get('/invoices/:id', portalController.getInvoiceById);

module.exports = router;

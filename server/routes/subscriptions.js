const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All subscription management routes are admin and staff only
router.use(verifyToken, requireRole('admin', 'staff'));

router.post('/price-preview', subscriptionController.pricePreview);
router.get('/', subscriptionController.listSubscriptions);
router.post('/', subscriptionController.createSubscription);
router.get('/:id', subscriptionController.getSubscriptionById);
router.patch('/:id/status', subscriptionController.updateStatus);

module.exports = router;

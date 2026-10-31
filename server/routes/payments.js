const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/', paymentController.recordPayment);
router.get('/', paymentController.listPayments);

module.exports = router;

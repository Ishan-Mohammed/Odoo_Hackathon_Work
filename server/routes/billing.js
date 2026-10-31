const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All billing actions require admin or staff permissions
router.use(verifyToken, requireRole('admin', 'staff'));

router.post('/preview', billingController.getPreview);
router.post('/run', billingController.postRun);

module.exports = router;

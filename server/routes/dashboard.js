const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('admin', 'staff'));

router.get('/', dashboardController.getDashboard);

module.exports = router;

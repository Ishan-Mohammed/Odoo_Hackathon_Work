const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('admin', 'staff'));

router.get('/', catalogController.listCustomers);
router.get('/:id', catalogController.getCustomerById);

module.exports = router;

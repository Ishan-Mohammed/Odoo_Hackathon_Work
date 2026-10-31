const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { PASSWORD_REGEX } = require('../controllers/authController');

// All staff endpoints require admin role
router.use(verifyToken, requireRole('admin'));

// GET /api/staff - List all staff members
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role = 'staff'
       ORDER BY id ASC`
    );
    res.json({ staff: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff - Create a new staff member
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const newStaff = insertResult.rows[0];
    res.status(201).json({
      user: newStaff,
      staff: newStaff,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

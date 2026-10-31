const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'brightloop_jwt_secret_dev';
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: '1d' }
  );
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      const msg = 'Name, email, and password are required.';
      return res.status(400).json({ error: msg, message: msg });
    }

    if (!PASSWORD_REGEX.test(password)) {
      const msg =
        'Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.';
      return res.status(400).json({ error: msg, message: msg });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const msg = 'Email already registered';
      return res.status(409).json({ error: msg, message: msg });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const newUser = insertResult.rows[0];
    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const genericSuccessResponse = {
      success: true,
      message: 'If that email address is in our system, we have sent a reset link to it.',
    };

    if (!email) {
      return res.json(genericSuccessResponse);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await pool.query(
        `UPDATE users
         SET reset_token = $1, reset_expiry = now() + interval '1 hour'
         WHERE id = $2`,
        [tokenHash, user.id]
      );

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetLink = `${clientUrl}/reset-password/${rawToken}`;
      console.log(`Password reset link: ${resetLink}`);
    }

    return res.json(genericSuccessResponse);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password or POST /api/auth/reset-password/:token
async function resetPassword(req, res, next) {
  try {
    const rawToken = req.body.token || req.params.token;
    const { password } = req.body;

    if (!rawToken) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const result = await pool.query(
      `SELECT id FROM users
       WHERE reset_token = $1 AND reset_expiry > now()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This link has expired' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_expiry = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    return res.json({
      success: true,
      message: 'Your password has been reset successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  signup,
  forgotPassword,
  resetPassword,
  getMe,
  PASSWORD_REGEX,
};

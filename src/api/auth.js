import api from './axios';
import { DEMO_PASSWORD } from '../config/demoCredentials';
import { isReal } from '../config/env';
import { adaptError } from './adapters';

/**
 * =====================================================================
 * API CONTRACT & SCHEMAS
 * =====================================================================
 * 1. login({ email, password })
 *    Request:  { email: string, password: string }
 *    Response: { token: string, user: { id: string, name: string, email: string, role: 'admin'|'staff'|'customer' } }
 *
 * 2. signup({ name, email, password })
 *    Request:  { name: string, email: string, password: string }
 *    Response: { token: string, user: { id: string, name: string, email: string, role: 'customer' } }
 *
 * 3. forgotPassword({ email })
 *    Request:  { email: string }
 *    Response: { success: boolean, message: string }
 *
 * 4. resetPassword({ token, password })
 *    Request:  { token: string, password: string }
 *    Response: { success: boolean, message: string }
 *
 * 5. getMe()
 *    Response: { user: { id: string, name: string, email: string, role: string } }
 * =====================================================================
 */

const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_USERS_STORAGE_KEY = 'brightloop_mock_users';

// Safe localStorage accessors for saved mock users
function getStoredMockUsers() {
  try {
    const raw = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read mock users from localStorage:', err);
    return [];
  }
}

function saveStoredMockUser(user) {
  try {
    const users = getStoredMockUsers();
    users.push(user);
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to write mock user to localStorage:', err);
  }
}

// Password requirement regex:
// At least 9 chars, 1 lowercase, 1 uppercase, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

export async function login({ email, password }) {
  if (!isReal('auth')) {
    await sleep(400);
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Check credentials against demo accounts
    const isDemoPass = password === DEMO_PASSWORD || password === 'password123';

    if (normalizedEmail === 'admin@brightloop.com' && isDemoPass) {
      return {
        token: 'mock-jwt-token-admin-12345',
        user: {
          id: 'usr_admin_01',
          name: 'Sarah Connor (Admin)',
          email: 'admin@brightloop.com',
          role: 'admin',
        },
      };
    }

    if (normalizedEmail === 'staff@brightloop.com' && isDemoPass) {
      return {
        token: 'mock-jwt-token-staff-67890',
        user: {
          id: 'usr_staff_02',
          name: 'David Miller (Ops)',
          email: 'staff@brightloop.com',
          role: 'staff',
        },
      };
    }

    if (normalizedEmail === 'customer@acme.com' && isDemoPass) {
      return {
        token: 'mock-jwt-token-cust-11223',
        user: {
          id: 'cust_01',
          customerId: 'cust_01',
          name: 'Acme Traders (Customer)',
          email: 'customer@acme.com',
          role: 'customer',
        },
      };
    }

    // 2. Check saved mock users (case-insensitive email, exact password)
    const savedUsers = getStoredMockUsers();
    const matchedUser = savedUsers.find(
      (u) => (u.email || '').toLowerCase() === normalizedEmail
    );

    if (matchedUser && matchedUser.password === password) {
      return {
        token: `mock-jwt-token-user-${Date.now()}`,
        user: {
          id: 'cust_01',
          customerId: 'cust_01',
          name: matchedUser.name,
          email: matchedUser.email,
          role: 'customer',
        },
      };
    }

    // Invalid credentials error simulation
    const error = new Error('Invalid email or password.');
    error.code = 'UNAUTHORIZED';
    error.status = 401;
    error.response = {
      status: 401,
      data: { message: 'Invalid email or password.' },
    };
    throw error;
  }

  // Real backend authentication
  try {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  } catch (err) {
    // Network / connection failure
    if (!err.response || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
      const netErr = new Error("Can't reach the server. Please try again.");
      netErr.code = 'NETWORK_ERROR';
      netErr.status = 0;
      netErr.response = {
        status: 0,
        data: { message: "Can't reach the server. Please try again." },
      };
      throw netErr;
    }

    // Wrong credentials
    if (err.status === 401 || err.response?.status === 401) {
      const authErr = new Error('Invalid email or password.');
      authErr.code = 'UNAUTHORIZED';
      authErr.status = 401;
      authErr.response = {
        status: 401,
        data: { message: 'Invalid email or password.' },
      };
      throw authErr;
    }

    const adapted = adaptError(err);
    if (adapted.code === 'NETWORK_ERROR') {
      adapted.message = "Can't reach the server. Please try again.";
      if (adapted.response?.data) {
        adapted.response.data.message = "Can't reach the server. Please try again.";
      }
    }
    throw adapted;
  }
}

export async function signup({ name, email, password }) {
  if (!isReal('auth')) {
    await sleep(450);
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Validate password rules
    if (!PASSWORD_REGEX.test(password || '')) {
      const error = new Error('Password does not satisfy all security requirements.');
      error.code = 'INVALID_PASSWORD';
      error.status = 400;
      error.response = {
        status: 400,
        data: { message: 'Password does not satisfy all security requirements.' },
      };
      throw error;
    }

    // 2. Validate email uniqueness against demo accounts & saved mock users
    const isDemoEmail =
      normalizedEmail === 'admin@brightloop.com' ||
      normalizedEmail === 'staff@brightloop.com' ||
      normalizedEmail === 'customer@acme.com';

    const savedUsers = getStoredMockUsers();
    const isAlreadySaved = savedUsers.some(
      (u) => (u.email || '').toLowerCase() === normalizedEmail
    );

    if (isDemoEmail || isAlreadySaved) {
      const error = new Error('Email is already registered.');
      error.code = 'CONFLICT';
      error.status = 409;
      error.response = {
        status: 409,
        data: { message: 'An account with this email address already exists.' },
      };
      throw error;
    }

    // 3. Save to localStorage under "brightloop_mock_users"
    const newUser = {
      name: (name || '').trim(),
      email: normalizedEmail,
      role: 'customer',
      password,
    };
    saveStoredMockUser(newUser);

    return {
      token: `mock-jwt-token-new-${Date.now()}`,
      user: {
        id: 'cust_01',
        customerId: 'cust_01',
        name: newUser.name,
        email: newUser.email,
        role: 'customer',
      },
    };
  }

  // Real backend registration
  try {
    const { data } = await api.post('/auth/signup', { name, email, password });
    return data;
  } catch (err) {
    if (!err.response || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
      const netErr = new Error("Can't reach the server. Please try again.");
      netErr.code = 'NETWORK_ERROR';
      netErr.status = 0;
      netErr.response = {
        status: 0,
        data: { message: "Can't reach the server. Please try again." },
      };
      throw netErr;
    }
    throw adaptError(err);
  }
}

export async function forgotPassword({ email }) {
  if (!isReal('auth')) {
    await sleep(400);
    return {
      success: true,
      message: 'If that email address is in our system, we have sent a reset link to it.',
    };
  }

  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (err) {
    if (!err.response || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
      const netErr = new Error("Can't reach the server. Please try again.");
      netErr.code = 'NETWORK_ERROR';
      netErr.status = 0;
      netErr.response = {
        status: 0,
        data: { message: "Can't reach the server. Please try again." },
      };
      throw netErr;
    }
    throw adaptError(err);
  }
}

export async function resetPassword({ token, password }) {
  if (!isReal('auth')) {
    await sleep(500);
    if (token === 'expired' || token === 'invalid') {
      const error = new Error('Reset link has expired or is invalid.');
      error.code = 'EXPIRED_TOKEN';
      error.response = {
        status: 400,
        data: { message: 'This password reset link has expired or has already been used.' },
      };
      throw error;
    }

    return {
      success: true,
      message: 'Your password has been reset successfully.',
    };
  }

  try {
    const { data } = await api.post(`/auth/reset-password/${token}`, { password });
    return data;
  } catch (err) {
    if (!err.response || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
      const netErr = new Error("Can't reach the server. Please try again.");
      netErr.code = 'NETWORK_ERROR';
      netErr.status = 0;
      netErr.response = {
        status: 0,
        data: { message: "Can't reach the server. Please try again." },
      };
      throw netErr;
    }
    throw adaptError(err);
  }
}

export async function getMe() {
  if (!isReal('auth')) {
    try {
      const stored = localStorage.getItem('brightloop_user');
      if (stored) {
        return { user: JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return {
      user: {
        id: 'usr_admin_01',
        name: 'Sarah Connor (Admin)',
        email: 'admin@brightloop.com',
        role: 'admin',
      },
    };
  }

  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (err) {
    throw adaptError(err);
  }
}

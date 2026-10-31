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

import { getStore, saveStore, createError } from './mock/store';

const sleep = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Password requirement regex:
// At least 9 chars, 1 lowercase, 1 uppercase, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

export async function login({ email, password }) {
  if (!isReal('auth')) {
    await sleep(350);
    const normalizedEmail = (email || '').trim().toLowerCase();
    const store = getStore();

    const isDemoPass = password === DEMO_PASSWORD || password === 'password123';

    // Find user in store by email
    const matched = (store.users || []).find(
      (u) => String(u.email || '').toLowerCase() === normalizedEmail
    );

    if (matched && (matched.password === password || (isDemoPass && (matched.email === 'admin@brightloop.com' || matched.email === 'staff@brightloop.com' || matched.email === 'customer@acme.com')))) {
      const userPayload = {
        id: String(matched.id),
        name: matched.name,
        email: matched.email,
        role: matched.role,
        customerId: matched.customerId ? String(matched.customerId) : undefined,
      };

      return {
        token: `mock-jwt-token-${matched.role}-${Date.now()}`,
        user: userPayload,
      };
    }

    throw createError('UNAUTHORIZED', 'Invalid email or password.');
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
    await sleep(350);
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    // 1. Validate password rules
    if (!PASSWORD_REGEX.test(password || '')) {
      throw createError('VALIDATION', 'Password does not satisfy all security requirements.');
    }

    // 2. Validate email uniqueness against store users
    const store = getStore();
    const isAlreadySaved = (store.users || []).some(
      (u) => String(u.email || '').toLowerCase() === normalizedEmail
    );

    if (isAlreadySaved) {
      throw createError('DUPLICATE_EMAIL', 'An account with this email address already exists.');
    }

    // 3. Create linked customer record and customer user
    const newCustId = `cust_${String((store.customers || []).length + 1).padStart(2, '0')}`;
    const newCustomer = {
      id: newCustId,
      name: cleanName,
      email: normalizedEmail,
      phone: '',
      city: '',
      address: '',
      activeSubscriptions: 0,
      outstanding: 0,
      totalPaid: 0,
      totalSpend: 0,
    };
    store.customers = store.customers || [];
    store.customers.unshift(newCustomer);

    const newUser = {
      id: `usr_cust_${Date.now()}`,
      customerId: newCustId,
      name: cleanName,
      email: normalizedEmail,
      role: 'customer',
      password,
      created_at: new Date().toISOString(),
    };
    store.users = store.users || [];
    store.users.push(newUser);
    saveStore(store);

    return {
      token: `mock-jwt-token-customer-${Date.now()}`,
      user: {
        id: newUser.id,
        customerId: newCustId,
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

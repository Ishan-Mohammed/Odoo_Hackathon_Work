import api from './axios';
import { DEMO_PASSWORD } from '../config/demoCredentials';
import { USE_MOCK } from '../config/env';

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
 * =====================================================================
 */

// Helper for simulating realistic network latency
const sleep = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login({ email, password }) {
  if (USE_MOCK) {
    await sleep(450);

    const normalizedEmail = email.trim().toLowerCase();

    // Check credentials against demo accounts
    if (normalizedEmail === 'admin@brightloop.com' && password === DEMO_PASSWORD) {
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

    if (normalizedEmail === 'staff@brightloop.com' && password === DEMO_PASSWORD) {
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

    if (normalizedEmail === 'customer@acme.com' && password === DEMO_PASSWORD) {
      return {
        token: 'mock-jwt-token-cust-11223',
        user: {
          id: 'usr_cust_03',
          name: 'Acme Traders (Customer)',
          email: 'customer@acme.com',
          role: 'customer',
        },
      };
    }

    // Wrong credentials error simulation
    const error = new Error('Invalid email or password.');
    error.response = {
      status: 401,
      data: { message: 'Invalid email or password. Please verify your credentials.' },
    };
    throw error;
  }

  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function signup({ name, email, password }) {
  if (USE_MOCK) {
    await sleep(550);

    const normalizedEmail = email.trim().toLowerCase();

    // Simulate already registered check
    if (
      normalizedEmail === 'admin@brightloop.com' ||
      normalizedEmail === 'staff@brightloop.com' ||
      normalizedEmail === 'customer@acme.com'
    ) {
      const error = new Error('Email is already registered.');
      error.response = {
        status: 409,
        data: { message: 'An account with this email address already exists.' },
      };
      throw error;
    }

    return {
      token: `mock-jwt-token-new-${Date.now()}`,
      user: {
        id: `usr_new_${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        role: 'customer',
      },
    };
  }

  const { data } = await api.post('/auth/signup', { name, email, password });
  return data;
}

export async function forgotPassword({ email }) {
  if (USE_MOCK) {
    await sleep(400);
    // Security best practice: Always return generic success regardless of whether email exists
    return {
      success: true,
      message: 'If that email address is in our system, we have sent a reset link to it.',
    };
  }

  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword({ token, password }) {
  if (USE_MOCK) {
    await sleep(500);

    // Simulated expired token test scenario
    if (token === 'expired' || token === 'invalid') {
      const error = new Error('Reset link has expired or is invalid.');
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

  const { data } = await api.post(`/auth/reset-password/${token}`, { password });
  return data;
}

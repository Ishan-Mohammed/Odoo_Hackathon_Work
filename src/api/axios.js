import axios from 'axios';
import { toast } from 'react-hot-toast';
import { adaptError } from './adapters';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s timeout
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('brightloop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(adaptError(error))
);

// Response interceptor: handle 401 unauthorized & 403 forbidden
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 403 Forbidden: Staff role safety - toast alert, never a blank page
    if (error.response?.status === 403) {
      toast.error("You don't have access to that");
    }

    // 401 Unauthorized: Session expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('brightloop_token');
      localStorage.removeItem('brightloop_user');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/signup')
      ) {
        window.location.href = `/login?sessionExpired=true`;
      }
    }

    const adapted = adaptError(error);
    return Promise.reject(adapted);
  }
);

export default api;

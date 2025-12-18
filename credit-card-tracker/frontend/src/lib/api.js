import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== Credit Cards API ====================
export const cardsApi = {
  getAll: () => api.get('/cards'),
  getById: (id) => api.get(`/cards/${id}`),
  getSummary: () => api.get('/cards/summary'),
  getUtilization: (id, days = 30) => api.get(`/cards/${id}/utilization`, { params: { days } }),
  create: (data) => api.post('/cards', data),
  update: (id, data) => api.put(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
};

// ==================== Statements API ====================
export const statementsApi = {
  getAll: (params) => api.get('/statements', { params }),
  getById: (id) => api.get(`/statements/${id}`),
  create: (data) => api.post('/statements', data),
  update: (id, data) => api.put(`/statements/${id}`, data),
  markPaid: (id, data) => api.patch(`/statements/${id}/pay`, data),
  delete: (id) => api.delete(`/statements/${id}`),
};

// ==================== Payments API ====================
export const paymentsApi = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  getStats: (params) => api.get('/payments/stats', { params }),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

// ==================== Transactions API ====================
export const transactionsApi = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  getStats: (params) => api.get('/transactions/stats', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

export default api;

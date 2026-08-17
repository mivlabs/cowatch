import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = axios.create({
  baseURL: AUTH_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cowatch_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ошибок для Rooms
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Rooms API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Перехватчик ошибок для Auth
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Auth API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
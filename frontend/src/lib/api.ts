import axios from 'axios';

// 🔥 ЖЕСТКИЙ ХАРДКОД ДЛЯ ТЕСТА (потом заменим на переменные)
const API_URL = 'https://rooms-production-f3bb.up.railway.app';
const AUTH_URL = 'https://auth-production-8d2e.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = axios.create({
  baseURL: AUTH_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Перехватчик запросов (добавляет токен)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cowatch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('cowatch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Перехватчик ответов (ловит просроченные токены)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Токен истек. Автоматический выход...');
      localStorage.removeItem('cowatch_token');
      localStorage.removeItem('cowatch_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cowatch_token');
      localStorage.removeItem('cowatch_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
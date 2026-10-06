import axios from 'axios';

// const API_URL = 'http://localhost:8003';
// const AUTH_URL = 'http://localhost:8001';

const API_URL = 'https://rooms-production-f3bb.up.railway.app';
const AUTH_URL = 'https://auth-production-8d2e.up.railway.app';

// const RECOMMENDATIONS_URL = 'http://localhost:8005';
const RECOMMENDATIONS_URL = 'https://recommendations-production-8eb9.up.railway.app';

export const recommendationsApi = axios.create({
  baseURL: RECOMMENDATIONS_URL,
  headers: { 'Content-Type': 'application/json' },
});


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

// Куда уходить после просроченного токена: внутри Telegram Mini App (/tg) — на
// её главную, где вход через initData повторится сам; на сайте — на главную.
function signedOutHome() {
  const { pathname } = window.location;
  return pathname === '/tg' || pathname.startsWith('/tg/') ? '/tg' : '/';
}

// Перехватчик ответов (ловит просроченные токены)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Токен истек. Автоматический выход...');
      localStorage.removeItem('cowatch_token');
      localStorage.removeItem('cowatch_user');
      window.location.href = signedOutHome();
    }
    return Promise.reject(error);
  }
);

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 на самом входе через Telegram — не «токен истёк», а отказ в логине:
    // его показывает TelegramProvider, перезагружать страницу не нужно.
    if (error.response?.status === 401 && !String(error.config?.url).includes('/auth/telegram')) {
      localStorage.removeItem('cowatch_token');
      localStorage.removeItem('cowatch_user');
      window.location.href = signedOutHome();
    }
    return Promise.reject(error);
  }
);
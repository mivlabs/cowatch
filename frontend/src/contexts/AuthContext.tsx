import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '@/lib/api';

export interface User {
  id: number;
  email?: string;
  username: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  loginAsGuest: (nickname: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔄 [Auth] Инициализация: проверяем localStorage...');
    const savedToken = localStorage.getItem('cowatch_token');
    const savedUser = localStorage.getItem('cowatch_user');

    if (savedToken && savedUser) {
      console.log('✅ [Auth] Токен и пользователь найдены в localStorage');
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      console.log('⚠️ [Auth] localStorage пуст');
    }
    setIsInitialized(true);
  }, []);

  const login = async (email: string, password: string) => {
    console.log('1️⃣ [Login] Начинаем вход...');
    try {
      const response = await authApi.post('/auth/login', { email, password });
      console.log('2️⃣ [Login] Ответ от сервера:', response.data);
      
      const { access_token } = response.data;
      console.log('3️⃣ [Login] Сохраняем токен в localStorage...');
      
      localStorage.setItem('cowatch_token', access_token);
      setToken(access_token);

      const payload = JSON.parse(atob(access_token.split('.')[1]));
      const userData: User = {
        id: payload.user_id,
        email: payload.sub,
        username: payload.sub.split('@')[0],
        isGuest: false,
      };

      localStorage.setItem('cowatch_user', JSON.stringify(userData));
      setUser(userData);
      console.log('4️⃣ [Login] Успешно! Токен сохранен.');
    } catch (error) {
      console.error('❌ [Login] ОШИБКА:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    console.log('1️⃣ [Register] Начинаем регистрацию...');
    await authApi.post('/auth/register', { email, password, username });
    await login(email, password);
  };

  const loginAsGuest = async (nickname: string) => {
    console.log('🟢 1. [Guest] Нажата кнопка входа как гость, ник:', nickname);
    try {
      console.log('🟢 2. [Guest] Отправляем запрос на /auth/guest...');
      const response = await authApi.post('/auth/guest', null, { 
        params: { username: nickname } 
      });
      
      console.log('🟢 3. [Guest] Ответ от сервера получен:', response.data);
      const { access_token } = response.data;

      console.log('🟢 4. [Guest] Сохраняем токен в localStorage...');
      localStorage.setItem('cowatch_token', access_token);
      setToken(access_token);

      const payload = JSON.parse(atob(access_token.split('.')[1]));
      
      const guestUser: User = {
        id: payload.user_id,
        username: nickname,
        isGuest: true,
      };

      localStorage.setItem('cowatch_user', JSON.stringify(guestUser));
      setUser(guestUser);
      
      console.log('🟢 5. [Guest] УСПЕХ! Проверь Local Storage, токен должен быть там.');
      
    } catch (error) {
      console.error('🔴 6. [Guest] КРИТИЧЕСКАЯ ОШИБКА:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('cowatch_token');
    localStorage.removeItem('cowatch_user');
    setToken(null);
    setUser(null);
  };

  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка авторизации...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginAsGuest,
        logout,
        isAuthenticated: !!user,
        isGuest: user?.isGuest || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
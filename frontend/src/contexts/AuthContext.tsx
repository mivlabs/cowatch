import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
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
  loginAsGuest: (nickname: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('cowatch_token');
    const savedUser = localStorage.getItem('cowatch_user');
    const guestUser = sessionStorage.getItem('cowatch_guest');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else if (guestUser) {
      setUser(JSON.parse(guestUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.post('/auth/login', { email, password });
    const { access_token } = response.data;

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
  };

  const register = async (email: string, password: string, username: string) => {
    await authApi.post('/auth/register', { email, password, username });
    await login(email, password);
  };

  // 🔥 ГОСТЕВОЙ ВХОД (теперь с настоящим токеном!)
  const loginAsGuest = async (nickname: string) => {
    try {
      // 1. Запрашиваем у бэкенда настоящий JWT токен для гостя
      const response = await authApi.post('/auth/guest', null, { 
        params: { username: nickname } 
      });
      
      const { access_token } = response.data;

      // 2. Сохраняем его в localStorage Точно так же, как для обычного пользователя!
      localStorage.setItem('cowatch_token', access_token);
      setToken(access_token);

      // 3. Распарсиваем токен, чтобы получить ID
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      
      const guestUser: User = {
        id: payload.user_id,
        username: nickname,
        isGuest: true,
      };

      localStorage.setItem('cowatch_user', JSON.stringify(guestUser));
      setUser(guestUser);
      
    } catch (error) {
      console.error("❌ Ошибка гостевого входа:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem('cowatch_token');
    localStorage.removeItem('cowatch_user');
    sessionStorage.removeItem('cowatch_guest');
    setToken(null);
    setUser(null);
  };

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
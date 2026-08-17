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

  // 🔥 ГОСТЕВОЙ ВХОД
  const loginAsGuest = (nickname: string) => {
    const guestId = Math.floor(Math.random() * 900000) + 100000;
    const guestUser: User = {
      id: guestId,
      username: nickname,
      isGuest: true,
    };

    sessionStorage.setItem('cowatch_guest', JSON.stringify(guestUser));
    setUser(guestUser);
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
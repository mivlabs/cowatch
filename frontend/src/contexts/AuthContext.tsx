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

  // 🔥 Гидратация состояния при загрузке приложения
  useEffect(() => {
    const savedToken = localStorage.getItem('cowatch_token');
    const savedUser = localStorage.getItem('cowatch_user');

    // Unified storage: и гости, и обычные пользователи теперь хранятся здесь
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error);
        logout(); // Сброс при поврежденных данных
      }
    }
    setIsInitialized(true);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.post('/auth/login', { email, password });
    const { access_token } = response.data;

    localStorage.setItem('cowatch_token', access_token);
    setToken(access_token);

    // Безопасное декодирование JWT payload на клиенте (без проверки подписи)
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
    // После успешной регистрации сразу выполняем вход
    await login(email, password);
  };

  // 🔥 Гостевой вход с генерацией полноценного JWT на бэкенде
  const loginAsGuest = async (nickname: string) => {
    try {
      // Передаем nickname как query parameter, так как это POST запрос без body
      const response = await authApi.post('/auth/guest', null, { 
        params: { username: nickname } 
      });
      
      const { access_token } = response.data;

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
      
    } catch (error) {
      console.error("❌ Ошибка гостевого входа:", error);
      throw error; // Пробрасываем ошибку выше, чтобы UI мог показать уведомление
    }
  };

  const logout = () => {
    localStorage.removeItem('cowatch_token');
    localStorage.removeItem('cowatch_user');
    setToken(null);
    setUser(null);
  };

  // Блокируем рендер детей до завершения гидратации, чтобы избежать ложных редиректов
  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string; // Если есть код, заходим в комнату после входа
}

export function JoinModal({ isOpen, onClose, roomCode }: JoinModalProps) {
  const [mode, setMode] = useState<'choice' | 'guest' | 'login'>('choice');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginAsGuest } = useAuth();

  const handleGuestLogin = async () => {
    if (nickname.trim().length < 2) {
      setError('Ник должен быть минимум 2 символа');
      return;
    }
    
    setLoading(true); // Блокируем кнопку, чтобы не нажали дважды
    setError('');

    try {
      // 🔥 ЖДЁМ, пока токен реально сохранится в localStorage!
      await loginAsGuest(nickname.trim());
      
      // И только ПОСЛЕ этого закрываем модалку и переходим дальше
      onClose();
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        navigate('/create');
      }
    } catch (err: any) {
      console.error('Ошибка гостевого входа:', err);
      setError('Не удалось войти как гость. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      onClose();
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        navigate('/create');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('choice');
    setNickname('');
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-background border border-white/10 rounded-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Выбор способа входа */}
            {mode === 'choice' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Добро пожаловать!</h2>
                <p className="text-muted-foreground mb-6">
                  {roomCode
                    ? 'Войди, чтобы присоединиться к комнате'
                    : 'Войди, чтобы создать комнату'}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => setMode('guest')}
                    className="w-full py-4 px-6 bg-muted/50 hover:bg-muted border border-white/10 rounded-xl flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Войти как гость</h3>
                      <p className="text-sm text-muted-foreground">
                        Просто введи ник, без регистрации
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('login')}
                    className="w-full py-4 px-6 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Войти через аккаунт</h3>
                      <p className="text-sm text-muted-foreground">
                        Сохраняй историю, достижения и аватарку
                      </p>
                    </div>
                  </button>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Нет аккаунта?{' '}
                  <button
                    onClick={handleClose}
                    className="text-primary hover:underline"
                  >
                    Зарегистрируйся
                  </button>
                </p>
              </div>
            )}

            {/* Гостевой вход */}
            {mode === 'guest' && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Гостевой вход</h2>
                <p className="text-muted-foreground mb-6">
                  Придумай ник для чата
                </p>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Твой ник..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGuestLogin()}
                    maxLength={20}
                    autoFocus
                    className="w-full px-4 py-3 bg-muted border border-white/10 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    onClick={handleGuestLogin}
                    disabled={loading} // 🔥 Блокируем кнопку во время загрузки
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Входим...' : `Войти как ${nickname || 'гость'} 🎭`}
                  </button>

                  <button
                    onClick={() => setMode('choice')}
                    className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    ← Назад
                  </button>
                </div>
              </div>
            )}

            {/* Вход через аккаунт */}
            {mode === 'login' && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Вход в аккаунт</h2>
                <p className="text-muted-foreground mb-6">
                  Введи email и пароль
                </p>

                <form onSubmit={handleAccountLogin} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-muted border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-muted border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Вход...' : 'Войти'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('choice')}
                    className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    ← Назад
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
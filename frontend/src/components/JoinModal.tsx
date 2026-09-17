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
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[var(--color-bg-elevated)]/90 p-6 relative backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--color-text-muted)]" />
            </button>

            {/* Выбор способа входа */}
            {mode === 'choice' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">Добро пожаловать!</h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  {roomCode
                    ? 'Войди, чтобы присоединиться к комнате'
                    : 'Войди, чтобы создать комнату'}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => setMode('guest')}
                    className="w-full py-4 px-6 bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 rounded-xl flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-cyan)]/20 flex items-center justify-center group-hover:bg-[var(--color-accent-cyan)]/30 transition-colors">
                      <User className="w-6 h-6 text-[var(--color-accent-cyan)]" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">Войти как гость</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Просто введи ник, без регистрации
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('login')}
                    className="w-full py-4 px-6 bg-[var(--color-accent-magenta)]/10 hover:bg-[var(--color-accent-magenta)]/20 border border-[var(--color-accent-magenta)]/30 rounded-xl flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-magenta)]/20 flex items-center justify-center group-hover:bg-[var(--color-accent-magenta)]/30 transition-colors">
                      <Mail className="w-6 h-6 text-[var(--color-accent-magenta)]" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">Войти через аккаунт</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Сохраняй историю, достижения и аватарку
                      </p>
                    </div>
                  </button>
                </div>

                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                  Нет аккаунта?{' '}
                  <button
                    onClick={handleClose}
                    className="text-[var(--color-accent-magenta)] hover:underline"
                  >
                    Зарегистрируйся
                  </button>
                </p>
              </div>
            )}

            {/* Гостевой вход */}
            {mode === 'guest' && (
              <div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">Гостевой вход</h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
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
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]"
                  />

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    onClick={handleGuestLogin}
                    disabled={loading} // 🔥 Блокируем кнопку во время загрузки
                    className="w-full py-3 bg-[var(--color-accent-cyan)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Входим...' : `Войти как ${nickname || 'гость'} 🎭`}
                  </button>

                  <button
                    onClick={() => setMode('choice')}
                    className="w-full py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm"
                  >
                    ← Назад
                  </button>
                </div>
              </div>
            )}

            {/* Вход через аккаунт */}
            {mode === 'login' && (
              <div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">Вход в аккаунт</h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  Введи email и пароль
                </p>

                <form onSubmit={handleAccountLogin} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-magenta)]"
                  />

                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-magenta)]"
                  />

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[var(--color-accent-magenta)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Вход...' : 'Войти'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('choice')}
                    className="w-full py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm"
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
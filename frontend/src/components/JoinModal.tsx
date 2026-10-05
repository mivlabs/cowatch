import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { CatSticker } from '@/components/brand/CatSticker';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string; // Если есть код, заходим в комнату после входа
}

const OPTION = 'grid w-full gap-1 rounded border border-line p-4 text-left transition-colors hover:border-cream';

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
      setError('В нике нужно хотя бы 2 символа.');
      return;
    }

    setLoading(true); // Блокируем кнопку, чтобы не нажали дважды
    setError('');

    try {
      // Ждём, пока токен реально сохранится в localStorage,
      // и только после этого закрываем окно и переходим дальше.
      await loginAsGuest(nickname.trim());
      onClose();
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        navigate('/create');
      }
    } catch (err) {
      console.error('Ошибка гостевого входа:', err);
      setError('Не получилось войти как гость. Попробуйте ещё раз.');
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
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Неверный email или пароль.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setMode('choice');
    setNickname('');
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  }, [onClose]);

  const goToRegister = () => {
    handleClose();
    navigate('/register');
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  const back = (
    <button
      type="button"
      onClick={() => {
        setError('');
        setMode('choice');
      }}
      className="cw-btn cw-btn-ghost justify-self-center"
    >
      Назад
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            exit={{ y: 12 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-title"
            className="cw-win w-full max-w-md text-cream"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cw-win-bar">
              <span>{roomCode ? `вход · ${roomCode}` : 'вход'}</span>
              <button type="button" onClick={handleClose} aria-label="Закрыть" className="px-1 leading-none">
                ×
              </button>
            </div>

            <div className="grid gap-5 p-6">
              {/* Выбор способа входа */}
              {mode === 'choice' && (
                <>
                  <div className="grid justify-items-center gap-3 text-center">
                    <CatSticker pose="wave" width={92} />
                    <h2 id="join-title" className="font-display text-[34px] font-medium italic leading-none">
                      Добро пожаловать
                    </h2>
                    <p className="text-cream-dim">
                      {roomCode ? 'Войдите, чтобы попасть в комнату.' : 'Войдите, чтобы создать комнату.'}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <button type="button" onClick={() => setMode('guest')} className={OPTION}>
                      <span className="font-display text-[22px] italic leading-tight">Войти как гость</span>
                      <span className="text-sm text-cream-dim">Только ник, без регистрации</span>
                    </button>
                    <button type="button" onClick={() => setMode('login')} className={OPTION}>
                      <span className="font-display text-[22px] italic leading-tight">Войти в аккаунт</span>
                      <span className="text-sm text-cream-dim">История просмотров и ачивки сохраняются</span>
                    </button>
                  </div>

                  <p className="text-center text-sm text-cream-dim">
                    Нет аккаунта?{' '}
                    <button type="button" onClick={goToRegister} className="text-gold underline-offset-4 hover:underline">
                      Зарегистрироваться
                    </button>
                  </p>
                </>
              )}

              {/* Гостевой вход */}
              {mode === 'guest' && (
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGuestLogin();
                  }}
                >
                  <div className="grid gap-1">
                    <h2 id="join-title" className="font-display text-[34px] font-medium italic leading-none">
                      Гостевой вход
                    </h2>
                    <p className="text-cream-dim">Придумайте ник, его увидят в чате.</p>
                  </div>
                  <label className="grid gap-2">
                    <span className="cw-label">Ник</span>
                    <input
                      id="guest-nickname"
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={20}
                      autoFocus
                      autoComplete="nickname"
                      className="cw-field"
                    />
                  </label>
                  {error && <p className="text-sm text-coral">{error}</p>}
                  <button type="submit" disabled={loading} className="cw-btn cw-btn-primary w-full">
                    {loading ? 'Входим…' : `Войти как ${nickname.trim() || 'гость'}`}
                  </button>
                  {back}
                </form>
              )}

              {/* Вход через аккаунт */}
              {mode === 'login' && (
                <form onSubmit={handleAccountLogin} className="grid gap-4">
                  <div className="grid gap-1">
                    <h2 id="join-title" className="font-display text-[34px] font-medium italic leading-none">
                      Вход в аккаунт
                    </h2>
                    <p className="text-cream-dim">Email и пароль от CoWatch.</p>
                  </div>
                  <label className="grid gap-2">
                    <span className="cw-label">Email</span>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      className="cw-field"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="cw-label">Пароль</span>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="cw-field"
                    />
                  </label>
                  {error && <p className="text-sm text-coral">{error}</p>}
                  <button type="submit" disabled={loading} className="cw-btn cw-btn-primary w-full">
                    {loading ? 'Входим…' : 'Войти'}
                  </button>
                  {back}
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { AuroraBackground } from '@/components/AuroraBackground';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg-base)] p-4">
      <AuroraBackground variant="cta" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
      >
        <h1 className="mb-2 text-center text-3xl font-bold text-[var(--color-text-primary)]">Вход в CoWatch</h1>
        <p className="mb-6 text-center text-[var(--color-text-secondary)]">Смотри вместе с друзьями</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 font-semibold text-[#14141f] shadow-[0_8px_24px_-4px_rgba(76,224,210,0.35)] transition-opacity disabled:opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(1deg, #fafaff 5.66%, #c7ccdb 38.68%, #8c8fb8 57.55%, #d9dbf2 76.42%, #a6a8cc 100%)',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-[var(--color-accent-cyan)] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

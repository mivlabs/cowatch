import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/AuthLayout';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, username);
      navigate('/');
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Не получилось создать аккаунт. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      label="Регистрация"
      title="Своё место в зале"
      subtitle="В аккаунте сохраняются история просмотров и ачивки."
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-gold underline-offset-4 hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2">
          <span className="cw-label">Имя пользователя</span>
          <input
            id="register-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="cw-field"
          />
        </label>
        <label className="grid gap-2">
          <span className="cw-label">Email</span>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="cw-field"
          />
        </label>
        <label className="grid gap-2">
          <span className="flex items-baseline justify-between gap-3">
            <span className="cw-label">Пароль</span>
            <span className="font-mono text-[11px] text-cream-dim">минимум 6 символов</span>
          </span>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="cw-field"
          />
        </label>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button type="submit" disabled={loading} className="cw-btn cw-btn-primary mt-1 w-full">
          {loading ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/AuthLayout';

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
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Не получилось войти. Проверьте email и пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      label="Вход"
      title="С возвращением"
      subtitle="Войдите, чтобы создавать комнаты и копить ачивки."
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to="/register" className="text-gold underline-offset-4 hover:underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2">
          <span className="cw-label">Email</span>
          <input
            id="login-page-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="cw-field"
          />
        </label>
        <label className="grid gap-2">
          <span className="cw-label">Пароль</span>
          <input
            id="login-page-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="cw-field"
          />
        </label>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button type="submit" disabled={loading} className="cw-btn cw-btn-primary mt-1 w-full">
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </AuthLayout>
  );
}

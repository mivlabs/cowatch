import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LogOut, Film, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AchievementsGrid } from '@/components/profile/AchievementsGrid';
import { WatchHistory } from '@/components/profile/WatchHistory';
import { AccountSettings } from '@/components/profile/AccountSettings';

// Типы данных, которые приходят с бэкенда
interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface HistoryItem {
  id: number;
  movie_title: string;
  movie_url: string;
  watched_at: string;
}

interface ProfileData {
  username: string;
  email: string | null;
  total_movies: number;
  total_hours: number;
  achievements: Achievement[];
  history: HistoryItem[];
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) {
    navigate('/');
    return null;
  }

  // 🔥 ЗАПРОС К РЕАЛЬНОМУ БЭКЕНДУ
  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const response = await authApi.get(`/auth/profile/${user.id}`);
      return response.data;
    },
    enabled: !!user.id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-b-2 border-[var(--color-accent-cyan)]" />
          <p className="text-[var(--color-text-secondary)]">Загружаем твой профиль...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] p-4">
        <h2 className="mb-4 text-2xl font-bold text-red-400">Не удалось загрузить профиль</h2>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-[var(--color-accent-cyan)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <header className="flex items-center justify-between px-4 py-5 md:px-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-5" />
          <span>На главную</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pb-16 md:px-8">
        <ProfileHeader username={profile.username} email={profile.email} isGuest={user.isGuest} />

        <div className="-mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <Film className="size-4 text-[var(--color-brand-amber)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">{profile.total_movies}</strong> фильмов
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <Clock className="size-4 text-[var(--color-accent-cyan)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">{profile.total_hours.toFixed(1)}ч</strong> просмотра
            </span>
          </div>
        </div>

        <AchievementsGrid achievements={profile.achievements} isGuest={user.isGuest} />
        <WatchHistory history={profile.history} isGuest={user.isGuest} />
        <AccountSettings isGuest={user.isGuest} />
      </div>
    </div>
  );
}

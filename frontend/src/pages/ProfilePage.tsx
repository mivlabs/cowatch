import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { plural } from '@/lib/utils';
import { authApi } from '@/lib/api';
import { Logo } from '@/components/Logo';
import { SiteFooter } from '@/components/SiteFooter';
import { NightSky } from '@/components/brand/NightSky';
import { CatSticker } from '@/components/brand/CatSticker';
import { PlateHeader } from '@/components/landing/PlateHeader';
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

const NAV_LINK = 'font-mono text-xs font-medium uppercase tracking-[0.12em] text-cream transition-colors hover:text-gold';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Хук вызывается всегда, до любых return: раньше он стоял после проверки
  // на пользователя, и порядок хуков менялся между рендерами.
  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const response = await authApi.get(`/auth/profile/${user!.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="relative grid min-h-screen place-items-center p-6 text-cream">
        <NightSky seed={31} className="fixed" />
        <div className="relative grid justify-items-center gap-5 text-center">
          <CatSticker pose="stretch" width={200} />
          <h1 className="font-display text-4xl font-medium italic">Загружаем профиль</h1>
          <div className="cw-progress w-56" role="progressbar" aria-label="Загружаем профиль" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="relative grid min-h-screen place-items-center p-6 text-cream">
        <NightSky seed={31} className="fixed" />
        <main className="relative grid max-w-[460px] justify-items-center gap-4 rounded border border-line bg-night p-8 text-center">
          <CatSticker pose="sit" width={130} />
          <h1 className="font-display text-[40px] font-medium italic leading-none">Профиль не загрузился</h1>
          <p className="text-cream-dim">Проверьте интернет и обновите страницу.</p>
          <button type="button" onClick={() => navigate('/')} className="cw-btn cw-btn-primary mt-2">
            На главную
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink pb-24 text-cream">
      <section className="relative overflow-hidden border-b border-line">
        <NightSky seed={23} stars={28} glowFrom={{ x: 0.65, y: 0.1 }} />
        <div className="relative mx-auto grid max-w-[1040px] gap-14 px-4 pb-12 pt-7">
          <nav aria-label="Главное меню" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to="/" aria-label="CoWatch, на главную" className="mr-auto">
              <Logo />
            </Link>
            <Link to="/" className={NAV_LINK}>
              На главную
            </Link>
            <button type="button" onClick={logout} className={NAV_LINK}>
              Выйти
            </button>
          </nav>

          <ProfileHeader
            username={profile.username}
            email={profile.email}
            isGuest={user.isGuest}
            totalMovies={profile.total_movies}
            totalHours={profile.total_hours}
          />
        </div>
      </section>

      <main className="mx-auto mt-[72px] grid max-w-[1040px] gap-[72px] px-4">
        <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
          <PlateHeader
            label="Ачивки"
            title={achievementsTitle(profile.achievements.length)}
          />
          <div className="min-w-0">
            <AchievementsGrid achievements={profile.achievements} isGuest={user.isGuest} />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
          <PlateHeader label="История" title="Что смотрели" />
          <div className="min-w-0">
            <WatchHistory history={profile.history} isGuest={user.isGuest} />
          </div>
        </section>

        <AccountSettings isGuest={user.isGuest} />
      </main>

      <div className="mt-[88px]">
        <SiteFooter />
      </div>
    </div>
  );
}

function achievementsTitle(count: number) {
  if (count === 0) return 'Пока впереди';
  return `${count} ${plural(count, ['наклейка', 'наклейки', 'наклеек'])}`;
}

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { plural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AchievementsGrid, type Achievement } from '@/components/profile/AchievementsGrid';
import { WatchHistory } from '@/components/profile/WatchHistory';
import { useTelegram, useTelegramBackButton } from '../useTelegram';
import { TgScreen } from '../components/TgScreen';
import { TgStatusScreen } from '../components/TgStatusScreen';
import { TgAvatar } from '../components/TgAvatar';

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

/** Stickers and watch history for the Telegram account; same data as /profile on the site. */
export function TgProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tgUser } = useTelegram();
  useTelegramBackButton('/tg');

  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['profile', user?.id],
    queryFn: async () => (await authApi.get(`/auth/profile/${user!.id}`)).data,
    enabled: !!user?.id,
  });

  if (!user || isLoading) {
    return <TgStatusScreen pose="stretch" title="Загружаем профиль" progress />;
  }

  if (error || !profile) {
    return (
      <TgStatusScreen pose="sit" title="Профиль не загрузился" text="Проверьте интернет и попробуйте ещё раз.">
        <button type="button" onClick={() => navigate('/tg')} className="cw-btn cw-btn-primary">
          На главную
        </button>
      </TgStatusScreen>
    );
  }

  const earned = profile.achievements.filter((a) => a.unlocked_at).length;

  return (
    <TgScreen seed={23}>
      <header className="grid gap-5 px-4 pt-4">
        <div className="flex items-center gap-4">
          <TgAvatar tgUser={tgUser} fallbackName={profile.username} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[32px] font-medium italic leading-none">{profile.username}</h1>
            <p className="mt-1.5 font-mono text-xs text-cream-dim">
              {tgUser?.username ? `@${tgUser.username} · ` : ''}аккаунт Telegram
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <div className="grid gap-1 rounded border border-line bg-night/80 p-3">
            <dt className="cw-label">Фильмов</dt>
            <dd className="font-mono text-2xl tabular-nums text-gold">{profile.total_movies}</dd>
          </div>
          <div className="grid gap-1 rounded border border-line bg-night/80 p-3">
            <dt className="cw-label">В зале</dt>
            <dd className="font-mono text-2xl tabular-nums text-gold">
              {profile.total_hours.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
              <span className="ml-1 text-sm text-cream">ч</span>
            </dd>
          </div>
          <div className="grid gap-1 rounded border border-line bg-night/80 p-3">
            <dt className="cw-label">Наклеек</dt>
            <dd className="font-mono text-2xl tabular-nums text-gold">
              {earned}
              <span className="ml-1 text-sm text-cream">из {profile.achievements.length}</span>
            </dd>
          </div>
        </dl>
      </header>

      <main className="grid gap-8 px-4 pb-10 pt-8">
        <section className="grid gap-3">
          <h2 className="font-display text-[26px] font-medium italic leading-none">
            {earned === 0 ? 'Наклейки впереди' : `${earned} ${plural(earned, ['наклейка', 'наклейки', 'наклеек'])}`}
          </h2>
          <AchievementsGrid achievements={profile.achievements} isGuest={false} userId={user.id} />
        </section>

        <section className="grid gap-3">
          <h2 className="font-display text-[26px] font-medium italic leading-none">Что смотрели</h2>
          <WatchHistory history={profile.history} isGuest={false} />
        </section>
      </main>
    </TgScreen>
  );
}

import { Avatar } from '@/components/Avatar';
import { plural } from '@/lib/utils';

interface ProfileHeaderProps {
  username: string;
  email: string | null;
  isGuest: boolean;
  totalMovies: number;
  totalHours: number;
}

export function ProfileHeader({ username, email, isGuest, totalMovies, totalHours }: ProfileHeaderProps) {
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar username={username} size="xl" />
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="break-words font-display text-[clamp(40px,7vw,64px)] font-medium italic leading-none">
              {username}
            </h1>
            <span className="rounded-sm border border-gold/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
              {isGuest ? 'гость' : 'аккаунт'}
            </span>
          </div>
          <p className="text-cream-dim">
            {isGuest ? 'Гостевой профиль: прогресс не сохраняется.' : email || 'Email не указан'}
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        <div className="grid gap-1">
          <dt className="cw-label">Посмотрено</dt>
          <dd className="font-mono text-3xl tabular-nums text-gold">
            {totalMovies} <span className="text-base text-cream">{plural(totalMovies, ['фильм', 'фильма', 'фильмов'])}</span>
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="cw-label">Вместе в зале</dt>
          <dd className="font-mono text-3xl tabular-nums text-gold">
            {totalHours.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} <span className="text-base text-cream">ч</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

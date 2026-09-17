import { Avatar } from '@/components/Avatar';

interface ProfileHeaderProps {
  username: string;
  email: string | null;
  isGuest: boolean;
}

export function ProfileHeader({ username, email, isGuest }: ProfileHeaderProps) {
  return (
    <div className="flex w-full items-center gap-6">
      <Avatar username={username} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">{username}</h1>
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: isGuest ? 'var(--color-brand-amber)' : 'var(--color-accent-cyan)',
              color: '#0a0a0f',
            }}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {isGuest ? 'Гость' : 'Зарегистрирован'}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {isGuest ? 'Гостевой профиль — прогресс не сохраняется' : email || 'Email не указан'}
        </p>
      </div>
    </div>
  );
}

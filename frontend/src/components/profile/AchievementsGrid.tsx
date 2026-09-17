import { cn } from '@/lib/utils';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface AchievementsGridProps {
  achievements: Achievement[];
  isGuest: boolean;
}

const ACCENTS = [
  'var(--color-accent-cyan)',
  'var(--color-accent-magenta)',
  'var(--color-brand-amber)',
];

/**
 * Only ever renders achievements the backend actually returned as unlocked —
 * there's no "all possible achievements + unlock criteria" endpoint, so no
 * locked/greyed-out placeholder cards like the Figma bento mock (those would
 * be invented copy, not real progress).
 */
export function AchievementsGrid({ achievements, isGuest }: AchievementsGridProps) {
  return (
    <section className="flex w-full flex-col gap-5">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
        Ачивки{achievements.length > 0 ? ` · ${achievements.length}` : ''}
      </h2>

      {achievements.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
          <p className="text-[var(--color-text-secondary)]">
            {isGuest ? (
              <>
                Ачивки доступны только зарегистрированным пользователям — гостевой просмотр в
                статистику не идёт.
              </>
            ) : (
              'У тебя пока нет ачивок. Создай комнату или посмотри первый фильм!'
            )}
          </p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {achievements.map((ach, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const featured = i === 0;
            return (
              <div
                key={ach.id}
                className={cn(
                  'relative flex flex-col items-start gap-3 overflow-hidden rounded-[20px] border-[1.5px] bg-[var(--color-bg-elevated)] px-[18px] py-5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]',
                  featured && 'sm:col-span-2 sm:px-6 sm:py-7',
                )}
                style={{ borderColor: accent }}
              >
                <div
                  className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full opacity-25 blur-3xl"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <div
                  className={cn(
                    'relative flex items-center justify-center rounded-2xl text-black',
                    featured ? 'size-[52px] text-2xl' : 'size-[42px] text-xl',
                  )}
                  style={{ backgroundColor: accent }}
                >
                  {ach.icon}
                </div>
                <p className={cn('relative font-semibold text-[var(--color-text-primary)]', featured ? 'text-xl' : 'text-[15px]')}>
                  {ach.title}
                </p>
                {ach.description && (
                  <p className="relative text-sm text-[var(--color-text-secondary)]">{ach.description}</p>
                )}
                <p className="relative text-xs" style={{ color: accent }}>
                  Получено · {new Date(ach.unlocked_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo } from 'react';
import { StarSticker } from '@/components/brand/StarSticker';
import { CatSticker } from '@/components/brand/CatSticker';
import { cn, textEmoji } from '@/lib/utils';

export interface Achievement {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  /** null until the sticker is earned. */
  unlocked_at: string | null;
}

interface AchievementsGridProps {
  achievements: Achievement[];
  isGuest: boolean;
  /** Owner of the profile; keys the "seen stickers" memory in this browser. */
  userId: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  hall: 'Зал',
  chat: 'Общение',
  watch: 'Просмотр',
};
const CATEGORY_ORDER = ['hall', 'chat', 'watch'];

function seenKey(userId: number) {
  return `cowatch_seen_achievements_${userId}`;
}

function readSeen(userId: number): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(userId: number, codes: string[]) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(codes));
  } catch {
    // Private window or blocked storage: the badge simply shows again next time.
  }
}

/**
 * The whole collection: earned stickers as cream stars, the rest dimmed with a
 * hint on how to get them. Stickers earned since the profile was last opened in
 * this browser carry a small "новая" tag, because the room itself does not yet
 * announce new stickers.
 */
export function AchievementsGrid({ achievements, isGuest, userId }: AchievementsGridProps) {
  // One string per set of earned stickers, so the effect below runs only when
  // the set actually changes, not on every render.
  const unlockedKey = achievements
    .filter((a) => a.unlocked_at)
    .map((a) => a.code)
    .join(',');

  // Compared with what this browser has already shown; the effect below then
  // remembers the current set, so the badge is visible on this visit and gone
  // on the next.
  const freshCodes = useMemo(() => {
    if (isGuest) return new Set<string>();
    const codes = unlockedKey ? unlockedKey.split(',') : [];
    const seen = readSeen(userId);
    return new Set(codes.filter((code) => !seen.has(code)));
  }, [userId, isGuest, unlockedKey]);

  useEffect(() => {
    if (isGuest) return;
    writeSeen(userId, unlockedKey ? unlockedKey.split(',') : []);
  }, [userId, isGuest, unlockedKey]);

  if (isGuest || achievements.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded border border-dashed border-line px-6 py-8 text-center">
        <CatSticker pose="sleep" width={130} breathing />
        <p className="max-w-[44ch] text-cream-dim">
          {isGuest
            ? 'Ачивки получают только зарегистрированные зрители: гостевые просмотры в статистику не идут.'
            : 'Ачивок пока нет. Соберите первую комнату или досмотрите фильм с друзьями.'}
        </p>
      </div>
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    items: achievements.filter((a) => a.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.category} className="grid gap-3">
          <h3 className="cw-label">
            {group.label}
            <span className="ml-2 text-gold">
              {group.items.filter((a) => a.unlocked_at).length}/{group.items.length}
            </span>
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2">
            {group.items.map((ach) => (
              <AchievementCard key={ach.code} achievement={ach} isFresh={freshCodes.has(ach.code)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AchievementCard({ achievement: ach, isFresh }: { achievement: Achievement; isFresh: boolean }) {
  const earned = Boolean(ach.unlocked_at);

  return (
    <li
      className={cn(
        'relative flex items-center gap-4 rounded border border-dashed p-4',
        earned ? 'border-line' : 'border-line/60',
      )}
    >
      <div className="relative grid size-16 shrink-0 place-items-center">
        <StarSticker size={64} className={cn('absolute inset-0', !earned && 'opacity-25 grayscale')} />
        <span
          className={cn(
            'cw-emoji relative mt-1 text-[22px] leading-none',
            earned ? 'text-ink' : 'text-cream-dim/70',
          )}
          aria-hidden
        >
          {textEmoji(ach.icon)}
        </span>
      </div>
      <div className="grid min-w-0 gap-1">
        <h4
          className={cn(
            'font-display text-[22px] font-medium italic leading-tight',
            !earned && 'text-cream-dim',
          )}
        >
          {ach.title}
        </h4>
        {ach.description && <p className="text-sm text-cream-dim">{ach.description}</p>}
        {earned ? (
          <p className="font-mono text-[11px] tracking-[0.06em] text-gold">
            получено{' '}
            {new Date(ach.unlocked_at!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <p className="font-mono text-[11px] tracking-[0.06em] text-cream-dim/70">ещё не получено</p>
        )}
      </div>
      {isFresh && (
        <span className="absolute right-3 top-3 rounded-sm bg-gold px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink">
          новая
        </span>
      )}
    </li>
  );
}

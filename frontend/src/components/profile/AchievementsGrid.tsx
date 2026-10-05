import { StarSticker } from '@/components/brand/StarSticker';
import { CatSticker } from '@/components/brand/CatSticker';
import { textEmoji } from '@/lib/utils';

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

/**
 * Only ever renders achievements the backend actually returned as unlocked —
 * there's no "all possible achievements + unlock criteria" endpoint, so no
 * locked placeholder cards (those would be invented copy, not real progress).
 * Each one is a cream star sticker with its icon drawn in the line emoji font.
 */
export function AchievementsGrid({ achievements, isGuest }: AchievementsGridProps) {
  if (achievements.length === 0) {
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

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {achievements.map((ach) => (
        <li key={ach.id} className="flex items-center gap-4 rounded border border-dashed border-line p-4">
          <div className="relative grid size-16 shrink-0 place-items-center">
            <StarSticker size={64} className="absolute inset-0" />
            <span className="cw-emoji relative mt-1 text-[22px] leading-none text-ink" aria-hidden>
              {textEmoji(ach.icon)}
            </span>
          </div>
          <div className="grid min-w-0 gap-1">
            <h3 className="font-display text-[22px] font-medium italic leading-tight">{ach.title}</h3>
            {ach.description && <p className="text-sm text-cream-dim">{ach.description}</p>}
            <p className="font-mono text-[11px] tracking-[0.06em] text-gold">
              получено{' '}
              {new Date(ach.unlocked_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

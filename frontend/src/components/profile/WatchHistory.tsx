import { NightSky } from '@/components/brand/NightSky';

interface HistoryItem {
  id: number;
  movie_title: string;
  movie_url: string;
  watched_at: string;
}

interface WatchHistoryProps {
  history: HistoryItem[];
  isGuest: boolean;
}

export function WatchHistory({ history, isGuest }: WatchHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="rounded border border-dashed border-line px-6 py-8 text-center text-cream-dim">
        {isGuest
          ? 'Для гостевого входа история просмотров не ведётся.'
          : 'История пока пустая. Самое время собрать комнату.'}
      </p>
    );
  }

  return (
    <ol className="grid">
      {history.map((item) => (
        <li key={item.id} className="flex items-center gap-4 border-t border-line py-4 last:border-b">
          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm border border-line" aria-hidden>
            <NightSky seed={item.id} stars={3} dense glowFrom={{ x: 1, y: 1 }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl italic leading-tight">{item.movie_title}</p>
            <p className="font-mono text-xs text-cream-dim">
              {new Date(item.watched_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {item.movie_url && (
            <a href={item.movie_url} target="_blank" rel="noreferrer" className="cw-btn cw-btn-ghost shrink-0">
              Пересмотреть
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}

import { Film } from 'lucide-react';

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

const ACCENTS = [
  'var(--color-brand-amber)',
  'var(--color-accent-magenta)',
  'var(--color-accent-cyan)',
];

export function WatchHistory({ history, isGuest }: WatchHistoryProps) {
  return (
    <section className="flex w-full flex-col gap-4">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">История просмотров</h2>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
          <Film className="mx-auto mb-3 size-10 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-secondary)]">
            {isGuest
              ? 'Для гостевого входа история просмотров не ведётся — сервер её не считает.'
              : 'История просмотров пуста. Самое время создать комнату!'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-[20px] bg-[var(--color-bg-elevated)]">
          {history.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] px-5 py-4 last:border-b-0"
            >
              <div
                className="flex h-[68px] w-12 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: ACCENTS[i % ACCENTS.length] }}
              >
                <Film className="size-5 text-black/50" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--color-text-primary)]">{item.movie_title}</p>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {new Date(item.watched_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {item.movie_url && (
                <a
                  href={item.movie_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-white/[0.06] px-3.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-white/[0.12]"
                >
                  Пересмотреть
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

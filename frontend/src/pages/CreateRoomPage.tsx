import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, recommendationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { NightSky } from '@/components/brand/NightSky';

interface CatalogItem {
  id: number;
  title: string;
  media_type: string;
  genres: string[];
  poster_path: string | null;
  release_year: number | null;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

function contentMeta(item: CatalogItem, withGenres = false) {
  return [
    item.media_type === 'tv' ? 'Сериал' : 'Фильм',
    item.release_year,
    withGenres && item.genres.length ? item.genres.slice(0, 2).join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Poster({ path }: { path: string | null }) {
  return path ? (
    <img src={`${TMDB_IMAGE_BASE}${path}`} alt="" className="h-12 w-8 shrink-0 rounded-sm border border-line object-cover" />
  ) : (
    <div className="h-12 w-8 shrink-0 rounded-sm border border-line bg-ink" />
  );
}

export function CreateRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Фильм может прийти уже выбранным с главной страницы (клик по карточке
  // в блоке "Для вас", см. Landing.tsx) — тогда ведём себя так, будто
  // его только что нашли через тот же поиск по каталогу, без повторного ввода.
  const preselected = (location.state as { preselected?: CatalogItem } | null)?.preselected ?? null;

  const [title, setTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);

  // --- Поиск по каталогу ---
  const [query, setQuery] = useState(preselected?.title ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<CatalogItem | null>(preselected);

  // Простой дебаунс без библиотек: ждём 300мс тишины после последней
  // буквы, прежде чем реально бить в API. Без этого — запрос на каждое
  // нажатие клавиши.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const catalogQuery = useQuery({
    queryKey: ['catalog-search', debouncedQuery],
    queryFn: async (): Promise<CatalogItem[]> => {
      const response = await recommendationsApi.get('/catalog/search', {
        params: { q: debouncedQuery, limit: 8 },
      });
      return response.data.items;
    },
    enabled: debouncedQuery.length >= 2 && !selectedContent,
  });

  const showDropdown = debouncedQuery.length >= 2 && !selectedContent;

  const handleSelectContent = (item: CatalogItem) => {
    setSelectedContent(item);
    setQuery(item.title);
  };

  const handleClearContent = () => {
    setSelectedContent(null);
    setQuery('');
  };

  // --- Создание комнаты ---
  const createRoomMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      max_participants: number;
      is_private: boolean;
      content_id?: number;
    }) => {
      const response = await api.post('/rooms/', data);
      return response.data;
    },
    onSuccess: (data) => {
      navigate(`/room/${data.code}`);
    },
    onError: (err) => {
      console.error('Ошибка создания комнаты:', err);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createRoomMutation.mutate({
        title: title.trim(),
        max_participants: maxParticipants,
        is_private: isPrivate,
        content_id: selectedContent?.id,
      });
    }
  };

  return (
    <div className="relative min-h-screen text-cream">
      <NightSky seed={9} className="fixed" />

      <div className="relative mx-auto grid max-w-[1040px] gap-12 px-4 pb-24 pt-7">
        <nav aria-label="Главное меню" className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/" aria-label="CoWatch, на главную" className="mr-auto">
            <Logo />
          </Link>
          <Link
            to="/"
            className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-cream transition-colors hover:text-gold"
          >
            На главную
          </Link>
        </nav>

        <main className="mx-auto grid w-full max-w-[560px] gap-8 rounded border border-line bg-night p-6 sm:p-8">
          <header className="grid gap-2.5">
            <span className="cw-label">Новая комната</span>
            <h1 className="font-display text-[clamp(40px,7vw,56px)] font-medium italic leading-[1.02]">Новый сеанс</h1>
            <p className="text-cream-dim">Фильм выбирать не обязательно, хватит названия комнаты.</p>
          </header>

          <form onSubmit={handleSubmit} className="grid gap-7">
            <div className="relative grid gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="content-search" className="cw-label">
                  Фильм или сериал
                </label>
                <span className="font-mono text-[11px] text-cream-dim">необязательно</span>
              </div>

              {selectedContent ? (
                <div className="flex items-center gap-3 rounded border border-line bg-ink/55 p-3">
                  <Poster path={selectedContent.poster_path} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl italic leading-tight">{selectedContent.title}</p>
                    <p className="font-mono text-xs text-cream-dim">{contentMeta(selectedContent)}</p>
                  </div>
                  <button type="button" onClick={handleClearContent} className="cw-btn cw-btn-ghost">
                    Убрать
                  </button>
                </div>
              ) : (
                <input
                  id="content-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Начните вводить название"
                  autoComplete="off"
                  className="cw-field"
                />
              )}

              {showDropdown && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded border border-line bg-night shadow-[5px_5px_0_var(--color-ultra)]">
                  {catalogQuery.isLoading && <p className="p-3 text-sm text-cream-dim">Ищем…</p>}
                  {catalogQuery.isError && (
                    <p className="p-3 text-sm text-coral">
                      Поиск фильмов сейчас не работает. Комнату можно создать и без фильма.
                    </p>
                  )}
                  {catalogQuery.data?.length === 0 && <p className="p-3 text-sm text-cream-dim">Ничего не нашли</p>}
                  {catalogQuery.data?.map((item) => (
                    <button
                      key={`${item.media_type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelectContent(item)}
                      className="flex w-full items-center gap-3 border-b border-line p-3 text-left transition-colors last:border-b-0 hover:bg-ink/60"
                    >
                      <Poster path={item.poster_path} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg italic leading-tight">{item.title}</p>
                        <p className="truncate font-mono text-xs text-cream-dim">{contentMeta(item, true)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="room-title" className="cw-label">
                Название комнаты
              </label>
              <input
                id="room-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Вечер с друзьями"
                required
                maxLength={50}
                className="cw-field"
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="room-seats" className="cw-label">
                  Мест в зале
                </label>
                <span className="font-mono text-2xl tabular-nums text-gold">{maxParticipants}</span>
              </div>
              <input
                id="room-seats"
                type="range"
                min="2"
                max="50"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                className="w-full accent-gold"
              />
              <div className="flex justify-between font-mono text-[11px] text-cream-dim" aria-hidden>
                <span>2</span>
                <span>50</span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate((value) => !value)}
              className="flex w-full items-center justify-between gap-4 rounded border border-line p-4 text-left transition-colors hover:border-cream"
            >
              <span className="grid gap-0.5">
                <span className="font-display text-[22px] italic leading-tight">Закрытый показ</span>
                <span className="text-sm text-cream-dim">Зайти можно только по коду</span>
              </span>
              <span
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
                  isPrivate ? 'border-gold bg-gold/25' : 'border-line bg-ink',
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all',
                    isPrivate ? 'left-[22px] bg-gold' : 'left-[3px] bg-cream-dim',
                  )}
                />
              </span>
            </button>

            {createRoomMutation.isError && (
              <p className="text-sm text-coral">Не получилось создать комнату. Попробуйте ещё раз.</p>
            )}

            <button
              type="submit"
              disabled={createRoomMutation.isPending || !title.trim()}
              className="cw-btn cw-btn-primary w-full"
            >
              {createRoomMutation.isPending ? 'Создаём…' : 'Создать комнату'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

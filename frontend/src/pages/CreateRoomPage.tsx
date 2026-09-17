import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Film, Users, Lock, Search, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, recommendationsApi } from '@/lib/api';

interface CatalogItem {
  id: number;
  title: string;
  media_type: string;
  genres: string[];
  poster_path: string | null;
  release_year: number | null;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

export function CreateRoomPage() {
  const [title, setTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Поиск по каталогу ---
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<CatalogItem | null>(null);

  // Фильм может прийти уже выбранным с главной страницы (клик по карточке
  // в блоке "Рекомендуем", см. Landing.tsx) — тогда ведём себя так, будто
  // его только что нашли через тот же поиск по каталогу, без повторного ввода.
  useEffect(() => {
    const preselected = (location.state as { preselected?: CatalogItem } | null)?.preselected;
    if (preselected) {
      setSelectedContent(preselected);
      setQuery(preselected.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    onError: (err: any) => {
      console.error('Ошибка создания комнаты:', err);
      alert('Не удалось создать комнату');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md"
      >
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">Создать комнату</h1>
        <p className="mb-6 text-[var(--color-text-secondary)]">Настрой параметры для совместного просмотра</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              <Search className="mr-2 inline w-4 h-4" />
              Фильм или сериал (необязательно)
            </label>

            {selectedContent ? (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] p-3">
                {selectedContent.poster_path && (
                  <img
                    src={`${TMDB_IMAGE_BASE}${selectedContent.poster_path}`}
                    alt={selectedContent.title}
                    className="h-12 w-8 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-text-primary)]">{selectedContent.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {selectedContent.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                    {selectedContent.release_year ? ` · ${selectedContent.release_year}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearContent}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Начни вводить название..."
                className="w-full rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]"
              />
            )}

            {showDropdown && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto overflow-hidden rounded-xl border border-white/10 bg-[var(--color-bg-elevated)]">
                {catalogQuery.isLoading && (
                  <p className="p-3 text-sm text-[var(--color-text-secondary)]">Ищу...</p>
                )}
                {catalogQuery.isError && (
                  <p className="p-3 text-sm text-red-400">
                    Не удалось получить каталог. Recommendations-сервис поднят?
                  </p>
                )}
                {catalogQuery.data?.length === 0 && (
                  <p className="p-3 text-sm text-[var(--color-text-secondary)]">Ничего не нашли</p>
                )}
                {catalogQuery.data?.map((item) => (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    type="button"
                    onClick={() => handleSelectContent(item)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    {item.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                        alt={item.title}
                        className="h-12 w-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-8 shrink-0 rounded bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-text-primary)]">{item.title}</p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        {item.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                        {item.release_year ? ` · ${item.release_year}` : ''}
                        {item.genres.length ? ` · ${item.genres.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              <Film className="mr-2 inline w-4 h-4" />
              Название комнаты
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вечер с друзьями"
              required
              maxLength={50}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              <Users className="mr-2 inline w-4 h-4" />
              Максимум участников: {maxParticipants}
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className="w-full accent-[var(--color-accent-cyan)]"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--color-bg-elevated)] p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-[var(--color-text-secondary)]" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Приватная комната</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Только по коду</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-white/10 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--color-accent-cyan)] peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-accent-cyan)]" />
            </label>
          </div>

          <button
            type="submit"
            disabled={createRoomMutation.isPending || !title.trim()}
            className="w-full rounded-xl px-4 py-3 font-semibold text-[#14141f] shadow-[0_8px_24px_-4px_rgba(125,59,237,0.35)] transition-opacity disabled:opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(1deg, #fafaff 5.66%, #c7ccdb 38.68%, #8c8fb8 57.55%, #d9dbf2 76.42%, #a6a8cc 100%)',
            }}
          >
            {createRoomMutation.isPending ? 'Создаю...' : 'Создать комнату'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

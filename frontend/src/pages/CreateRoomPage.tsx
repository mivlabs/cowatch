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
  // в блоке "Рекомендуем", см. HomePage.tsx) — тогда ведём себя так, будто
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-muted/30 backdrop-blur-md border border-white/10 rounded-2xl p-8"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <h1 className="text-3xl font-bold mb-2">Создать комнату</h1>
        <p className="text-muted-foreground mb-6">Настрой параметры для совместного просмотра</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Фильм или сериал (необязательно)
            </label>

            {selectedContent ? (
              <div className="flex items-center gap-3 p-3 bg-background border border-white/10 rounded-xl">
                {selectedContent.poster_path && (
                  <img
                    src={`${TMDB_IMAGE_BASE}${selectedContent.poster_path}`}
                    alt={selectedContent.title}
                    className="w-8 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedContent.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedContent.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                    {selectedContent.release_year ? ` · ${selectedContent.release_year}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearContent}
                  className="p-1 text-muted-foreground hover:text-foreground"
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
                className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}

            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-background border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {catalogQuery.isLoading && (
                  <p className="p-3 text-sm text-muted-foreground">Ищу...</p>
                )}
                {catalogQuery.isError && (
                  <p className="p-3 text-sm text-red-400">
                    Не удалось получить каталог. Recommendations-сервис поднят?
                  </p>
                )}
                {catalogQuery.data?.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Ничего не нашли</p>
                )}
                {catalogQuery.data?.map((item) => (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    type="button"
                    onClick={() => handleSelectContent(item)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors"
                  >
                    {item.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                        alt={item.title}
                        className="w-8 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-muted rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
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
            <label className="block text-sm font-medium mb-2">
              <Film className="w-4 h-4 inline mr-2" />
              Название комнаты
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вечер с друзьями"
              required
              maxLength={50}
              className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Максимум участников: {maxParticipants}
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-background border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Приватная комната</p>
                <p className="text-sm text-muted-foreground">Только по коду</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={createRoomMutation.isPending || !title.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createRoomMutation.isPending ? 'Создаю...' : 'Создать комнату'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

import { api, recommendationsApi } from '@/lib/api';
import type { Room } from '@/types/room';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { RoomHeader } from '@/components/room/RoomHeader';
import { MovieBanner } from '@/components/room/MovieBanner';
import { ChatPanel } from '@/components/room/ChatPanel';
import {
  useRoomWebSocket,
  type VideoReaction
} from '@/hooks/useRoomWebSocket';

// Минимальная форма ответа GET /catalog/{content_id} — нужны только поля для
// баннера "вы выбрали этот фильм", остальное (жанры и т.д.) тут не нужно.
interface SelectedCatalogItem {
  id: number;
  title: string;
  media_type: string;
  poster_path: string | null;
  release_year: number | null;
}

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const queryClient = useQueryClient();

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeReactions, setActiveReactions] = useState<VideoReaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processedReactionIds = useRef(new Set<string>());

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/');
    }
  }, [isInitialized, isAuthenticated, navigate]);

  const { messages, videoEvents, isConnected, sendChatMessage, sendVideoEvent, sendReaction, isHost } = useRoomWebSocket({
    code: code || '',
    userId: user?.id || 1,
    username: user?.username || 'User',
  });

  const { data: room, isLoading, error } = useQuery<Room>({
    queryKey: ['room', code],
    queryFn: async () => {
      const response = await api.get<Room>(`/rooms/${code}`);
      return response.data;
    },
    enabled: !!code,
  });

  // Комната хранит только room.content_id (число, ссылка на каталог фильмов
  // в recommendations-сервисе) — чтобы показать хосту постер/название того,
  // что он выбрал при создании комнаты, тянем карточку отдельным запросом
  // (разные БД, cross-service, JOIN тут в принципе невозможен).
  const { data: selectedMovie } = useQuery<SelectedCatalogItem>({
    queryKey: ['catalog-item', room?.content_id],
    queryFn: async () => {
      const response = await recommendationsApi.get<SelectedCatalogItem>(`/catalog/${room!.content_id}`);
      return response.data;
    },
    enabled: !!room?.content_id,
    staleTime: Infinity, // карточка каталога не меняется, перезапрашивать нет смысла
  });

  useEffect(() => {
    const newReactions = messages.filter((msg): msg is VideoReaction => msg.type === 'video_reaction');

    const uniqueNewReactions = newReactions.filter((r) => {
      const id = `${r.user_id}-${r.timestamp}`;
      if (processedReactionIds.current.has(id)) return false;
      processedReactionIds.current.add(id);
      return true;
    });

    if (uniqueNewReactions.length > 0) {
      setActiveReactions((prev) => [...prev, ...uniqueNewReactions]);
    }
  }, [messages]);

  // video_changed приходит по WS всем участникам комнаты (не только хосту,
  // который уже обновил свой кэш оптимистично). Без этого гости видели бы
  // новое видео/название только после ручного рефреша страницы.
  useEffect(() => {
    const lastVideoChanged = [...videoEvents].reverse().find((e) => e.type === 'video_changed');
    if (!lastVideoChanged) return;

    queryClient.setQueryData(['room', code], (oldData: any) => {
      if (!oldData) return oldData;
      const rawTitle = lastVideoChanged.title?.trim();
      const nextTitle = rawTitle ? `${oldData.title} — ${rawTitle}` : oldData.title;
      if (
        oldData.current_movie_url === lastVideoChanged.url &&
        oldData.current_movie_title === nextTitle
      ) {
        return oldData;
      }
      return {
        ...oldData,
        current_movie_url: lastVideoChanged.url,
        current_movie_title: nextTitle,
        current_position: 0,
        is_playing: false,
      };
    });
  }, [videoEvents, code, queryClient]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveReactions(prev => {
        const filtered = prev.filter(r => now - new Date(r.timestamp).getTime() < 3000);
        if (filtered.length === prev.length) return prev;
        return filtered;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReaction = (emoji: string) => {
    if (!user) return;
    sendReaction(emoji);
    const reaction: VideoReaction = {
      type: 'video_reaction',
      emoji,
      user_id: user.id,
      username: user.username,
      timestamp: new Date().toISOString(),
    };
    setActiveReactions(prev => [...prev, reaction]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleCopyCode = () => {
    if (code) navigator.clipboard.writeText(code);
  };

  const handleVideoPlay = useCallback((position: number) => {
    sendVideoEvent('video_play', position);
  }, [sendVideoEvent]);

  const handleVideoPause = useCallback((position: number) => {
    sendVideoEvent('video_pause', position);
  }, [sendVideoEvent]);

  const handleVideoSeek = useCallback((position: number) => {
    sendVideoEvent('video_seek', position);
  }, [sendVideoEvent]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-b-2 border-[var(--color-accent-cyan)]" />
          <p className="text-[var(--color-text-secondary)]">Загружаю комнату...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] p-4">
        <h2 className="mb-4 text-2xl font-bold text-red-400">Комната не найдена</h2>
        <p className="mb-6 text-[var(--color-text-secondary)]">Код "{code}" не существует</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-[var(--color-accent-cyan)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          На главную
        </button>
      </div>
    );
  }

  const videoUrl = room.current_movie_url || '';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <RoomHeader
        title={room.title}
        code={room.code}
        isHost={isHost}
        isConnected={isConnected}
        participantsCount={room.participants_count}
        maxParticipants={room.max_participants}
        onBack={() => navigate('/')}
        onCopyCode={handleCopyCode}
      />

      {isHost && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            setIsSubmitting(true);
            const formData = new FormData(e.currentTarget);
            const url = formData.get('videoUrl') as string;
            if (!url.trim()) {
              setIsSubmitting(false);
              return;
            }
            const manualTitle = (formData.get('videoTitle') as string)?.trim() || '';
            const title = selectedMovie?.title || manualTitle || undefined;
            try {
              await api.patch(`/rooms/${code}/video`, { url: url.trim(), title });
              queryClient.setQueryData(['room', code], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  current_movie_url: url.trim(),
                  current_movie_title: title ? `${oldData.title} — ${title}` : oldData.title,
                  current_position: 0,
                  is_playing: false,
                };
              });
              (e.target as HTMLFormElement).reset();
            } catch (err) {
              console.error('Ошибка обновления видео:', err);
              alert('Не удалось обновить видео');
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] bg-white/[0.03] p-2.5 md:p-3"
        >
          <span className="whitespace-nowrap text-xs text-[var(--color-text-secondary)] md:text-sm">🎬</span>
          <input
            name="videoUrl"
            type="text"
            placeholder="Ссылка на YouTube или Rutube..."
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
          />
          {!selectedMovie && (
            <input
              name="videoTitle"
              type="text"
              maxLength={90}
              placeholder="Название фильма (необязательно)"
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
            />
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="whitespace-nowrap rounded-lg bg-[var(--color-accent-cyan)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 md:px-4 md:text-sm"
          >
            {isSubmitting ? '...' : 'Загрузить'}
          </button>
        </form>
      )}

      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-[240px] flex-1 flex-col p-4 md:min-h-[400px] md:p-6 lg:min-h-0">
          <div
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] border-[1.5px] bg-[#050508]"
            style={{
              borderColor: 'rgba(76,224,210,0.9)',
              boxShadow: '0px 20px 50px -12px rgba(0,0,0,0.5), 0px 0px 60px -6px rgba(76,224,210,0.22)',
            }}
          >
            <VideoPlayer
              url={videoUrl}
              isHost={isHost}
              videoEvents={videoEvents}
              initialPosition={room.current_position}
              initialIsPlaying={room.is_playing}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onSeek={handleVideoSeek}
            />
            <ReactionOverlay reactions={activeReactions} />

            {isHost && selectedMovie && (
              <MovieBanner
                title={selectedMovie.title}
                posterPath={selectedMovie.poster_path}
                releaseYear={selectedMovie.release_year}
              />
            )}

            <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/60 p-2 backdrop-blur-md md:bottom-6 md:gap-3 md:p-3">
              {['❤️', '🔥', '😂', '😮', '👏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 text-xl transition-transform hover:scale-125 active:scale-95 md:text-2xl"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {!videoUrl && (
              <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(13,13,18,0.65)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] backdrop-blur-md">
                <Film className="size-3.5" />
                Видео ещё не выбрано
              </div>
            )}
          </div>
        </div>

        <ChatPanel
          ref={messagesEndRef}
          messages={messages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={handleSend}
          isConnected={isConnected}
        />
      </main>
    </div>
  );
}

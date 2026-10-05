import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState, useRef, useEffect, useCallback } from 'react';

import { api, recommendationsApi } from '@/lib/api';
import type { Room } from '@/types/room';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { RoomHeader } from '@/components/room/RoomHeader';
import { MovieBanner } from '@/components/room/MovieBanner';
import { ChatPanel } from '@/components/room/ChatPanel';
import { GreetingToast } from '@/components/room/GreetingToast';
import { NightSky } from '@/components/brand/NightSky';
import { reactionGlyph } from '@/lib/utils';
import { CatSticker } from '@/components/brand/CatSticker';
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

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏'];

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const queryClient = useQueryClient();

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeReactions, setActiveReactions] = useState<VideoReaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

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
    // Комнаты нет — это окончательный ответ, повторять запрос бессмысленно
    // (иначе экран «Такой комнаты нет» появлялся только через ~7 секунд ретраев).
    retry: (failureCount, err) =>
      !(isAxiosError(err) && err.response?.status === 404) && failureCount < 3,
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

    queryClient.setQueryData<Room>(['room', code], (oldData) => {
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

  const handleCopyLink = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку:', err);
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const url = ((formData.get('videoUrl') as string) || '').trim();
    if (!url) return;
    const manualTitle = (formData.get('videoTitle') as string)?.trim() || '';
    const title = selectedMovie?.title || manualTitle || undefined;

    setIsSubmitting(true);
    setVideoError('');
    try {
      await api.patch(`/rooms/${code}/video`, { url, title });
      queryClient.setQueryData<Room>(['room', code], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          current_movie_url: url,
          current_movie_title: title ? `${oldData.title} — ${title}` : oldData.title,
          current_position: 0,
          is_playing: false,
        };
      });
      form.reset();
    } catch (err) {
      console.error('Ошибка обновления видео:', err);
      setVideoError('Не получилось включить видео. Проверьте ссылку и попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="relative grid min-h-screen place-items-center p-6 text-cream">
        <NightSky seed={13} className="fixed" />
        <div className="relative grid justify-items-center gap-5 text-center">
          <CatSticker pose="stretch" width={220} />
          <h1 className="font-display text-4xl font-medium italic">Комната просыпается</h1>
          <div className="cw-progress w-56" role="progressbar" aria-label="Загружаем комнату" />
        </div>
      </div>
    );
  }

  if (error || !room) {
    const notFound = !error || (isAxiosError(error) && error.response?.status === 404);
    return (
      <div className="relative grid min-h-screen place-items-center p-6 text-cream">
        <NightSky seed={21} className="fixed" />
        <main className="relative grid max-w-[460px] justify-items-center gap-4 rounded border border-line bg-night p-8 text-center">
          <CatSticker pose="sit" width={140} />
          <span className="cw-label">Код {code}</span>
          <h1 className="font-display text-[44px] font-medium italic leading-none">
            {notFound ? 'Такой комнаты нет' : 'Комната не открылась'}
          </h1>
          <p className="text-cream-dim">
            {notFound
              ? 'Проверьте код: возможно, в нём опечатка.'
              : 'Проверьте интернет и обновите страницу.'}
          </p>
          <button type="button" onClick={() => navigate('/')} className="cw-btn cw-btn-primary mt-2">
            На главную
          </button>
        </main>
      </div>
    );
  }

  const videoUrl = room.current_movie_url || '';

  return (
    <div className="flex min-h-screen flex-col bg-ink text-cream">
      <RoomHeader
        title={room.title}
        code={room.code}
        isHost={isHost}
        isConnected={isConnected}
        participantsCount={room.participants_count}
        maxParticipants={room.max_participants}
        linkCopied={linkCopied}
        onCopyLink={handleCopyLink}
      />

      {isHost && (
        <form
          onSubmit={handleVideoSubmit}
          className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6"
        >
          <label htmlFor="video-url" className="cw-label mr-1">
            Видео
          </label>
          <input
            id="video-url"
            name="videoUrl"
            type="text"
            placeholder="Ссылка на YouTube, Rutube или видеофайл"
            autoComplete="off"
            className="cw-field w-auto min-w-0 flex-[2_1_240px] py-2.5 text-sm"
          />
          {!selectedMovie && (
            <input
              id="video-title"
              name="videoTitle"
              type="text"
              maxLength={90}
              placeholder="Название фильма, если хотите"
              aria-label="Название фильма"
              autoComplete="off"
              className="cw-field w-auto min-w-0 flex-[1_1_180px] py-2.5 text-sm"
            />
          )}
          <button type="submit" disabled={isSubmitting} className="cw-btn cw-btn-primary px-4 py-3">
            {isSubmitting ? 'Включаем…' : 'Включить'}
          </button>
          {videoError && <p className="basis-full text-sm text-coral">{videoError}</p>}
        </form>
      )}

      <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <div className="flex min-h-[260px] flex-1 flex-col gap-3 p-4 md:min-h-[420px] md:p-6 lg:min-h-0">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded border border-line bg-black">
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

            {isConnected && <GreetingToast code={room.code} participantsCount={room.participants_count} />}

            {isHost && selectedMovie && (
              <MovieBanner
                title={selectedMovie.title}
                posterPath={selectedMovie.poster_path}
                releaseYear={selectedMovie.release_year}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Реакции">
            <span className="cw-label mr-1">Реакции</span>
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(emoji)}
                className="cw-emoji rounded-full border border-coral/40 px-3 py-1.5 text-lg leading-none transition-colors hover:border-coral hover:bg-coral/10 active:translate-y-px"
              >
                {reactionGlyph(emoji)}
              </button>
            ))}
          </div>
        </div>

        <ChatPanel
          ref={messagesEndRef}
          messages={messages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={handleSend}
          isConnected={isConnected}
          code={room.code}
          currentUsername={user?.username}
        />
      </main>

    </div>
  );
}

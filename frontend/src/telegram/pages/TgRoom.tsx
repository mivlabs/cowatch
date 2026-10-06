import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import { cn, reactionGlyph } from '@/lib/utils';
import { roomInviteLink } from '@/lib/telegramBot';
import { tryWebApp } from '@/lib/telegram';
import type { Room } from '@/types/room';
import { useAuth } from '@/contexts/AuthContext';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { CatSticker } from '@/components/brand/CatSticker';
import { useRoomWebSocket, type VideoReaction } from '@/hooks/useRoomWebSocket';
import { useTelegram, useTelegramBackButton, useTelegramMainButton } from '../useTelegram';
import { rememberRoom } from '../recentRooms';
import { TgScreen } from '../components/TgScreen';
import { TgStatusScreen } from '../components/TgStatusScreen';
import { TgChat } from '../components/TgChat';

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏'];

/**
 * The room on a phone inside Telegram: player on top, reactions, chat below.
 * Same WebSocket protocol as the site, so people in Telegram and on cowatch.fun
 * share one room.
 */
export function TgRoom() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { webApp, haptic, share } = useTelegram();
  useTelegramBackButton('/tg');

  const [chatInput, setChatInput] = useState('');
  const [activeReactions, setActiveReactions] = useState<VideoReaction[]>([]);
  const [videoFormOpen, setVideoFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const processedReactionIds = useRef(new Set<string>());

  const { messages, videoEvents, isConnected, sendChatMessage, sendVideoEvent, sendVideoEnded, sendReaction, isHost } =
    useRoomWebSocket({
      code,
      userId: user?.id || 0,
      username: user?.username || 'Зритель',
    });

  const { data: room, isLoading, error } = useQuery<Room>({
    queryKey: ['room', code],
    queryFn: async () => (await api.get<Room>(`/rooms/${code}`)).data,
    enabled: !!code,
    retry: (failureCount, err) => !(isAxiosError(err) && err.response?.status === 404) && failureCount < 3,
  });

  // Keep the room in "recent" and register the viewer as a participant. The
  // join call is what tells the host (through the bot) that someone came in;
  // "already in this room" and "room is full" are fine to ignore here, the
  // WebSocket decides who actually watches.
  useEffect(() => {
    if (!room || !user) return;
    rememberRoom(webApp, { code: room.code, title: room.title });
    if (room.host_id !== user.id) {
      api.post(`/rooms/${room.code}/join`).catch(() => undefined);
    }
  }, [room, user, webApp]);

  // While watching, a stray swipe down should not close the Mini App.
  useEffect(() => {
    if (!webApp) return;
    tryWebApp(() => webApp.disableVerticalSwipes?.());
    tryWebApp(() => webApp.enableClosingConfirmation());
    return () => {
      tryWebApp(() => webApp.enableVerticalSwipes?.());
      tryWebApp(() => webApp.disableClosingConfirmation());
    };
  }, [webApp]);

  const invite = useCallback(() => {
    if (!room) return;
    haptic('tap');
    share(roomInviteLink(room.code), `Зову смотреть вместе: ${room.title}. Код комнаты ${room.code}`);
  }, [room, haptic, share]);
  useTelegramMainButton(room ? 'Пригласить друзей' : null, invite);

  useEffect(() => {
    const incoming = messages.filter((msg): msg is VideoReaction => msg.type === 'video_reaction');
    const fresh = incoming.filter((r) => {
      const id = `${r.user_id}-${r.timestamp}`;
      if (processedReactionIds.current.has(id)) return false;
      processedReactionIds.current.add(id);
      return true;
    });
    if (fresh.length > 0) setActiveReactions((prev) => [...prev, ...fresh]);
  }, [messages]);

  useEffect(() => {
    const lastVideoChanged = [...videoEvents].reverse().find((e) => e.type === 'video_changed');
    if (!lastVideoChanged) return;
    queryClient.setQueryData<Room>(['room', code], (oldData) => {
      if (!oldData) return oldData;
      const rawTitle = lastVideoChanged.title?.trim();
      const nextTitle = rawTitle ? `${oldData.title} — ${rawTitle}` : oldData.title;
      if (oldData.current_movie_url === lastVideoChanged.url && oldData.current_movie_title === nextTitle) {
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
      setActiveReactions((prev) => {
        const kept = prev.filter((r) => now - new Date(r.timestamp).getTime() < 3000);
        return kept.length === prev.length ? prev : kept;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReaction = (emoji: string) => {
    if (!user) return;
    haptic('tap');
    sendReaction(emoji);
    setActiveReactions((prev) => [
      ...prev,
      { type: 'video_reaction', emoji, user_id: user.id, username: user.username, timestamp: new Date().toISOString() },
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleCopyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      haptic('success');
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      invite(); // no clipboard in this webview: offer the share sheet instead
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const url = ((formData.get('videoUrl') as string) || '').trim();
    if (!url) return;
    const title = ((formData.get('videoTitle') as string) || '').trim() || undefined;

    setIsSubmitting(true);
    setVideoError('');
    try {
      await api.patch(`/rooms/${code}/video`, { url, title });
      queryClient.setQueryData<Room>(['room', code], (oldData) =>
        oldData
          ? {
              ...oldData,
              current_movie_url: url,
              current_movie_title: title ? `${oldData.title} — ${title}` : oldData.title,
              current_position: 0,
              is_playing: false,
            }
          : oldData,
      );
      form.reset();
      setVideoFormOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Ошибка обновления видео:', err);
      haptic('error');
      setVideoError('Не получилось включить видео. Проверьте ссылку.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoPlay = useCallback((position: number) => sendVideoEvent('video_play', position), [sendVideoEvent]);
  const handleVideoPause = useCallback((position: number) => sendVideoEvent('video_pause', position), [sendVideoEvent]);
  const handleVideoSeek = useCallback((position: number) => sendVideoEvent('video_seek', position), [sendVideoEvent]);
  const handleVideoEnded = useCallback(() => sendVideoEnded(), [sendVideoEnded]);

  if (isLoading) {
    return <TgStatusScreen pose="stretch" title="Комната просыпается" progress />;
  }

  if (error || !room) {
    const notFound = !error || (isAxiosError(error) && error.response?.status === 404);
    return (
      <TgStatusScreen
        pose="sit"
        title={notFound ? 'Такой комнаты нет' : 'Комната не открылась'}
        text={notFound ? `Код ${code}: проверьте, нет ли опечатки.` : 'Проверьте интернет и попробуйте ещё раз.'}
      >
        <button type="button" onClick={() => navigate('/tg')} className="cw-btn cw-btn-primary">
          На главную
        </button>
      </TgStatusScreen>
    );
  }

  const videoUrl = room.current_movie_url || '';
  const showVideoForm = isHost && (videoFormOpen || !videoUrl);

  return (
    <TgScreen sky={false} className="tg-room bg-ink">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate font-display text-[22px] font-medium italic leading-none">{room.title}</h1>
            {isHost && (
              <span className="shrink-0 rounded-sm border border-gold/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-gold">
                хост
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-2 font-mono text-[11px] text-cream-dim">
            <span className={cn('size-1.5 rounded-full', isConnected ? 'bg-gold' : 'animate-pulse bg-coral')} aria-hidden />
            {isConnected ? `в зале ${room.participants_count} из ${room.max_participants}` : 'подключаемся…'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="shrink-0 rounded border border-line px-2.5 py-1.5 font-mono text-sm tracking-[0.25em] text-gold active:translate-y-px"
          aria-label={`Код комнаты ${room.code}, нажмите, чтобы скопировать`}
        >
          {codeCopied ? 'готово' : room.code}
        </button>
        {isHost && videoUrl && (
          <button
            type="button"
            onClick={() => setVideoFormOpen((open) => !open)}
            className="cw-btn cw-btn-line px-2.5 py-1.5 text-[10px]"
            aria-expanded={videoFormOpen}
          >
            Видео
          </button>
        )}
      </header>

      {showVideoForm && (
        <form onSubmit={handleVideoSubmit} className="grid gap-2 border-b border-line px-4 py-3">
          <input
            id="tg-video-url"
            name="videoUrl"
            type="url"
            inputMode="url"
            placeholder="Ссылка на YouTube, Rutube или видеофайл"
            autoComplete="off"
            className="cw-field py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <input
              id="tg-video-title"
              name="videoTitle"
              type="text"
              maxLength={90}
              placeholder="Название, если хотите"
              aria-label="Название фильма"
              autoComplete="off"
              className="cw-field min-w-0 flex-1 py-2.5 text-sm"
            />
            <button type="submit" disabled={isSubmitting} className="cw-btn cw-btn-primary px-4 py-2.5 text-[11px]">
              {isSubmitting ? '…' : 'Включить'}
            </button>
          </div>
          {videoError && <p className="text-sm text-coral">{videoError}</p>}
        </form>
      )}

      <div className="relative flex aspect-video w-full shrink-0 overflow-hidden bg-black">
        {videoUrl ? (
          <VideoPlayer
            url={videoUrl}
            isHost={isHost}
            videoEvents={videoEvents}
            initialPosition={room.current_position}
            initialIsPlaying={room.is_playing}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onSeek={handleVideoSeek}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-4 text-center">
            <div className="grid justify-items-center gap-2">
              <CatSticker pose="sleep" width={96} breathing />
              <p className="font-display text-xl italic leading-tight">{isHost ? 'Вставьте ссылку на видео' : 'Ждём хоста'}</p>
              {!isHost && <p className="text-xs text-cream-dim">Видео пойдёт у вас с того же кадра.</p>}
            </div>
          </div>
        )}
        <ReactionOverlay reactions={activeReactions} />
      </div>

      {/* Inviting lives on Telegram's own main button at the bottom of the screen. */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5" role="group" aria-label="Реакции">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReaction(emoji)}
            className="cw-emoji flex-1 rounded-full border border-coral/40 py-1.5 text-lg leading-none active:translate-y-px"
          >
            {reactionGlyph(emoji)}
          </button>
        ))}
      </div>

      <TgChat
        messages={messages}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onSend={handleSend}
        isConnected={isConnected}
        currentUsername={user?.username}
      />
    </TgScreen>
  );
}

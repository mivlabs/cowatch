import { useRef, useEffect, useState, memo, useMemo } from 'react';
import type { VideoSyncMessage } from '@/hooks/useRoomWebSocket';
import { useVideoSync } from '@/hooks/useVideoSync';
import { createYouTubePlayer, loadYouTubeIframeApi } from '@/lib/youtube';
import type { YTPlayerInstance } from '@/types/youtube';
import { VideoPlaceholder } from './VideoPlaceholder';

interface VideoPlayerProps {
  url: string;
  isHost: boolean;
  videoEvents: VideoSyncMessage[];
  initialPosition?: number;
  initialIsPlaying?: boolean;
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
}

function getVideoType(url: string): 'youtube' | 'vimeo' | 'rutube' | 'file' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('rutube.ru')) return 'rutube';
  return 'file';
}

function extractYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function extractRutubeId(url: string): string | null {
  const match =
    url.match(/rutube\.ru\/video\/([a-f0-9]{32})/i) ||
    url.match(/rutube\.ru\/play\/embed\/([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

function createYouTubeSyncAdapter(player: YTPlayerInstance) {
  return {
    play: (position: number) => {
      player.seekTo(position, true);
      player.playVideo();
    },
    pause: (position: number) => {
      player.seekTo(position, true);
      player.pauseVideo();
    },
    seek: (position: number) => {
      player.seekTo(position, true);
    },
    getCurrentTime: () => player.getCurrentTime(),
  };
}

const YouTubePlayer = memo(
  ({
    videoId,
    videoEvents,
    onPlay,
    onPause,
    onSeek,
    isHost,
    initialPosition = 0,
    initialIsPlaying = false,
  }: {
    videoId: string;
    videoEvents: VideoSyncMessage[];
    onPlay: (position: number) => void;
    onPause: (position: number) => void;
    onSeek: (position: number) => void;
    isHost: boolean;
    initialPosition?: number;
    initialIsPlaying?: boolean;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    const syncAdapter = useMemo(
      () => (playerRef.current ? createYouTubeSyncAdapter(playerRef.current) : null),
      [isPlayerReady],
    );

    const { handleHostStateChange, isSyncing } = useVideoSync({
      isHost,
      isPlayerReady,
      player: syncAdapter,
      videoEvents,
      initialState: { position: initialPosition, isPlaying: initialIsPlaying },
      onPlay,
      onPause,
      onSeek,
    });

    const handleHostStateChangeRef = useRef(handleHostStateChange);
    const isSyncingRef = useRef(isSyncing);
    handleHostStateChangeRef.current = handleHostStateChange;
    isSyncingRef.current = isSyncing;

    useEffect(() => {
      let cancelled = false;
      let player: YTPlayerInstance | null = null;

      const mountPlayer = async () => {
        if (!containerRef.current) {
          return;
        }

        await loadYouTubeIframeApi();
        if (cancelled || !containerRef.current) {
          return;
        }

        player = createYouTubePlayer(containerRef.current, videoId, {
          isHost,
          onReady: (readyPlayer) => {
            playerRef.current = readyPlayer;
            setIsPlayerReady(true);
          },
          onStateChange: (state, readyPlayer) => {
            if (!isHost) {
              return;
            }

            const YT = window.YT!;
            if (state === YT.PlayerState.PLAYING) {
              handleHostStateChangeRef.current(true, readyPlayer.getCurrentTime());
            } else if (state === YT.PlayerState.PAUSED) {
              handleHostStateChangeRef.current(false, readyPlayer.getCurrentTime());
            } else if (state === YT.PlayerState.BUFFERING && isSyncingRef.current()) {
              return;
            }
          },
        });
        playerRef.current = player;
      };

      setIsPlayerReady(false);
      playerRef.current = null;
      mountPlayer();

      return () => {
        cancelled = true;
        setIsPlayerReady(false);
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [videoId, isHost]);

    return <div ref={containerRef} className="w-full h-full" />;
  },
);
YouTubePlayer.displayName = 'YouTubePlayer';

const RutubePlayer = memo(
  ({
    videoId,
    videoEvents,
    onPlay,
    onPause,
    onSeek,
    isHost,
    initialPosition = 0,
    initialIsPlaying = false,
  }: {
    videoId: string;
    videoEvents: VideoSyncMessage[];
    onPlay: (position: number) => void;
    onPause: (position: number) => void;
    onSeek: (position: number) => void;
    isHost: boolean;
    initialPosition?: number;
    initialIsPlaying?: boolean;
  }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const currentTimeRef = useRef(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    const rutubeAdapter = useMemo(
      () => ({
        play: (position: number) => {
          const win = iframeRef.current?.contentWindow;
          if (!win) return;
          win.postMessage(JSON.stringify({ type: 'player:setCurrentTime', data: { time: position } }), '*');
          win.postMessage(JSON.stringify({ type: 'player:play' }), '*');
        },
        pause: (position: number) => {
          const win = iframeRef.current?.contentWindow;
          if (!win) return;
          win.postMessage(JSON.stringify({ type: 'player:setCurrentTime', data: { time: position } }), '*');
          win.postMessage(JSON.stringify({ type: 'player:pause' }), '*');
        },
        seek: (position: number) => {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ type: 'player:setCurrentTime', data: { time: position } }),
            '*',
          );
        },
        getCurrentTime: () => currentTimeRef.current,
      }),
      [isPlayerReady],
    );

    const { handleHostStateChange } = useVideoSync({
      isHost,
      isPlayerReady,
      player: rutubeAdapter,
      videoEvents,
      initialState: { position: initialPosition, isPlaying: initialIsPlaying },
      onPlay,
      onPause,
      onSeek,
    });

    useEffect(() => {
      const timer = setTimeout(() => setIsPlayerReady(true), 1500);
      return () => {
        clearTimeout(timer);
        setIsPlayerReady(false);
      };
    }, [videoId]);

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://rutube.ru') {
          return;
        }

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          if (data.type === 'player:changeState') {
            const state = data.data?.state;
            if (state === 'playing') {
              handleHostStateChange(true, currentTimeRef.current);
            } else if (state === 'paused' || state === 'pause') {
              handleHostStateChange(false, currentTimeRef.current);
            }
          }

          if (data.type === 'player:currentTime') {
            currentTimeRef.current = data.data?.time || 0;
          }
        } catch {
          // Ignore unrelated postMessage payloads
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [handleHostStateChange]);

    return (
      <iframe
        key={videoId}
        ref={iframeRef}
        src={`https://rutube.ru/play/embed/${videoId}`}
        className="w-full h-full"
        frameBorder="0"
        allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title="Rutube player"
      />
    );
  },
);
RutubePlayer.displayName = 'RutubePlayer';

export function VideoPlayer({
  url,
  isHost,
  videoEvents,
  initialPosition = 0,
  initialIsPlaying = false,
  onPlay,
  onPause,
  onSeek,
}: VideoPlayerProps) {
  const cleanUrl = url ? url.trim() : '';
  const videoType = cleanUrl ? getVideoType(cleanUrl) : 'file';

  const syncBadge = !isHost ? (
    <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-line bg-ink/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cream">
      <span className="size-1.5 rounded-full bg-gold" aria-hidden />
      Синхрон с хостом
    </div>
  ) : null;

  if (!cleanUrl) {
    return (
      <div className="flex flex-1 bg-ink">
        <VideoPlaceholder isHost={isHost} />
      </div>
    );
  }

  if (videoType === 'youtube') {
    const youtubeId = extractYoutubeId(cleanUrl);
    if (!youtubeId) {
      return (
        <div className="grid flex-1 place-items-center bg-ink p-6 text-center text-cream-dim">
          <p>Не получилось открыть ссылку на YouTube. Проверьте её и вставьте ещё раз.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center bg-black relative">
        <YouTubePlayer
          videoId={youtubeId}
          videoEvents={videoEvents}
          onPlay={onPlay}
          onPause={onPause}
          onSeek={onSeek}
          isHost={isHost}
          initialPosition={initialPosition}
          initialIsPlaying={initialIsPlaying}
        />
        {syncBadge}
      </div>
    );
  }

  if (videoType === 'rutube') {
    const rutubeId = extractRutubeId(cleanUrl);
    if (!rutubeId) {
      return (
        <div className="grid flex-1 place-items-center bg-ink p-6 text-center text-cream-dim">
          <p>Не получилось открыть ссылку на Rutube. Проверьте её и вставьте ещё раз.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center bg-black relative">
        <RutubePlayer
          videoId={rutubeId}
          videoEvents={videoEvents}
          onPlay={onPlay}
          onPause={onPause}
          onSeek={onSeek}
          isHost={isHost}
          initialPosition={initialPosition}
          initialIsPlaying={initialIsPlaying}
        />
        {syncBadge}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black relative">
      <video
        src={cleanUrl}
        controls={isHost}
        className="w-full h-full"
        onPlay={() => isHost && onPlay(0)}
        onPause={() => isHost && onPause(0)}
      />
      {syncBadge}
    </div>
  );
}

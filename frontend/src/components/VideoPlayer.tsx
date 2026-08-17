import { useRef, useEffect, useState, memo, useCallback } from 'react';
import type { VideoEvent, VideoChangedEvent } from '@/hooks/useRoomWebSocket';
import { VideoPlaceholder } from './VideoPlaceholder';

interface VideoPlayerProps {
  url: string;
  isHost: boolean;
  videoEvents: VideoEvent[];
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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function extractRutubeId(url: string): string | null {
  const match = url.match(/rutube\.ru\/video\/([a-f0-9]{32})/i) || url.match(/rutube\.ru\/play\/embed\/([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

// ─── YouTube Player (Официальный IFrame API) ───────────────────
const YouTubePlayer = memo(({ videoId, videoEvents, onPlay, onPause, onSeek, isHost }: {
  videoId: string;
  videoEvents: VideoEvent[];
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  isHost: boolean;
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const lastProcessedEventId = useRef<string | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (containerRef.current) {
        playerRef.current = new (window as any).YT.Player(containerRef.current, {
          videoId: videoId,
          playerVars: { autoplay: 0, controls: isHost ? 1 : 0, rel: 0, modestbranding: 1, enablejsapi: 1 },
          events: {
            onReady: () => {
              console.log('✅ [YouTube] IFrame API успешно инициализирован!');
              lastTimeRef.current = 0;
            },
            onStateChange: (event: any) => {
              if (isSyncingRef.current) return; 
              if (event.data === 1 && isHost) {
                onPlay(playerRef.current.getCurrentTime());
              } else if (event.data === 2 && isHost) {
                onPause(playerRef.current.getCurrentTime());
              }
            }
          }
        });
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [videoId, isHost, onPlay, onPause]);

  // 🔥 Детекция перемотки (1 секунда, безопаснее)
  useEffect(() => {
    if (!isHost || !playerRef.current) return;
    const interval = setInterval(() => {
      if (isSyncingRef.current) return; // 🔥 ИГНОРИРУЕМ, ЕСЛИ МЫ САМИ СДЕЛАЛИ SEEK
      
      const currentTime = playerRef.current.getCurrentTime();
      const diff = Math.abs(currentTime - lastTimeRef.current);
      
      if (lastTimeRef.current > 0 && diff > 1.5) {
        console.log('🔀 [YouTube] Хост перемотал на:', currentTime.toFixed(2));
        onSeek(currentTime);
      }
      lastTimeRef.current = currentTime;
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isHost, onSeek]);

  // 🔥 Реакция на события WebSocket
  useEffect(() => {
    if (videoEvents.length === 0 || !playerRef.current) return;
    const latest = videoEvents[videoEvents.length - 1];
    if (latest.type === 'video_changed') return;

    const eventId = `${latest.type}-${latest.timestamp}`;
    if (lastProcessedEventId.current === eventId) return;
    lastProcessedEventId.current = eventId;

    // 🔥 БЛОКИРУЕМ ИНТЕРВАЛ НА 2 СЕКУНДЫ
    isSyncingRef.current = true;
    setTimeout(() => { isSyncingRef.current = false; }, 2000);

    if (latest.type === 'video_play') {
      playerRef.current.seekTo(latest.position, true);
      playerRef.current.playVideo();
    } else if (latest.type === 'video_pause') {
      playerRef.current.seekTo(latest.position, true);
      playerRef.current.pauseVideo();
    } else if (latest.type === 'video_seek') {
      playerRef.current.seekTo(latest.position, true);
    }
  }, [videoEvents]);

  return <div ref={containerRef} className="w-full h-full" />;
});
YouTubePlayer.displayName = 'YouTubePlayer';

// ─── Rutube Player ───────────────────
const RutubePlayer = memo(({ videoId, videoEvents, onPlay, onPause, onSeek, isHost }: {
  videoId: string;
  videoEvents: VideoEvent[];
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  isHost: boolean;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedEventId = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => { isInitialLoadRef.current = false; }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const onPlayRef = useRef(onPlay); onPlayRef.current = onPlay;
  const onPauseRef = useRef(onPause); onPauseRef.current = onPause;
  const onSeekRef = useRef(onSeek); onSeekRef.current = onSeek;

  const blockSync = (ms = 2500) => {
    isSyncingRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => { isSyncingRef.current = false; }, ms);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'player:changeState') {
          const state = data.data?.state;
          if (isSyncingRef.current || isInitialLoadRef.current) return;
          if (state === 'playing' && isHost) onPlayRef.current(currentTimeRef.current);
          else if ((state === 'paused' || state === 'pause') && isHost) onPauseRef.current(currentTimeRef.current);
        }
        if (data.type === 'player:currentTime') {
          const newTime = data.data?.time || 0;
          if (isSyncingRef.current || isInitialLoadRef.current) {
            lastTimeRef.current = newTime;
            currentTimeRef.current = newTime;
            return; 
          }
          const diff = Math.abs(newTime - lastTimeRef.current);
          if (lastTimeRef.current > 0 && diff > 1.5 && isHost) {
            blockSync(3000);
            onSeekRef.current(newTime);
          }
          lastTimeRef.current = newTime;
          currentTimeRef.current = newTime;
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [isHost]);

  useEffect(() => {
    if (videoEvents.length === 0) return;
    const latest = videoEvents[videoEvents.length - 1];
    if (latest.type === 'video_changed') return;

    const eventId = `${latest.type}-${latest.timestamp}`;
    if (lastProcessedEventId.current === eventId) return; 
    lastProcessedEventId.current = eventId;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    blockSync(2000);

    if (latest.type === 'video_play') iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:play' }), '*');
    else if (latest.type === 'video_pause') iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:pause' }), '*');
    else if (latest.type === 'video_seek') iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:setCurrentTime', data: { time: latest.position } }), '*');
  }, [videoEvents]);

  return (
    <iframe key={videoId} ref={iframeRef} src={`https://rutube.ru/play/embed/${videoId}`} className="w-full h-full" frameBorder="0" allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
  );
});
RutubePlayer.displayName = 'RutubePlayer';

// ─── Основной компонент VideoPlayer ────────────────────────
export function VideoPlayer({ url, isHost, videoEvents, onPlay, onPause, onSeek }: VideoPlayerProps) {
  const cleanUrl = url ? url.trim() : '';
  const videoType = cleanUrl ? getVideoType(cleanUrl) : 'file';

  if (!cleanUrl) {
    return <div className="flex-1 flex items-center justify-center bg-black"><VideoPlaceholder isHost={isHost} /></div>;
  }

  if (videoType === 'youtube') {
    const youtubeId = extractYoutubeId(cleanUrl);
    if (!youtubeId) return <div className="flex-1 flex items-center justify-center bg-black text-white"><p>Неверная ссылка на YouTube</p></div>;

    return (
      <div className="flex-1 flex items-center justify-center bg-black relative">
        <YouTubePlayer videoId={youtubeId} videoEvents={videoEvents} onPlay={onPlay} onPause={onPause} onSeek={onSeek} isHost={isHost} />
        {!isHost && <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">🔄 Синхронизировано с хостом</div>}
      </div>
    );
  }

  if (videoType === 'rutube') {
    const rutubeId = extractRutubeId(cleanUrl);
    if (!rutubeId) return <div className="flex-1 flex items-center justify-center bg-black text-white"><p>Неверная ссылка на Rutube</p></div>;

    return (
      <div className="flex-1 flex items-center justify-center bg-black relative">
        <RutubePlayer videoId={rutubeId} videoEvents={videoEvents} onPlay={onPlay} onPause={onPause} onSeek={onSeek} isHost={isHost} />
        {!isHost && <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">🔄 Синхронизировано с хостом</div>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black relative">
      <video src={cleanUrl} controls={isHost} className="w-full h-full" onPlay={() => isHost && onPlay(0)} onPause={() => isHost && onPause(0)} />
      {!isHost && <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">🔄 Синхронизировано с хостом</div>}
    </div>
  );
}
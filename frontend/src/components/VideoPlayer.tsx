import { useRef, useEffect, useState, memo } from 'react';
import ReactPlayer from 'react-player';
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

function extractRutubeId(url: string): string | null {
  const match = url.match(/rutube\.ru\/video\/([a-f0-9]{32})/i) || url.match(/rutube\.ru\/play\/embed\/([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

// ─── Rutube Player (уже имеет защиту) ───────────────────
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
          if (isSyncingRef.current) return; // 🔥 Игнорируем, если это ответ на нашу команду
          if (state === 'playing') onPlayRef.current(currentTimeRef.current);
          else if (state === 'paused' || state === 'pause') onPauseRef.current(currentTimeRef.current);
        }
        if (data.type === 'player:currentTime') {
          const newTime = data.data?.time || 0;
          if (isSyncingRef.current) {
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
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const lastTimeRef = useRef(0);
  const lastProcessedEventId = useRef<string | null>(null);
  
  // 🔥 ГЛАВНЫЙ ЗАЩИТНЫЙ ФЛАГ
  const isSyncingRef = useRef(false);

  if (!url || url.trim() === '') {
    return <div className="flex-1 flex items-center justify-center bg-black"><VideoPlaceholder isHost={isHost} /></div>;
  }

  const videoType = getVideoType(url);

  useEffect(() => {
    if (videoType === 'rutube') return;
    if (videoEvents.length === 0) return;

    const latest = videoEvents[videoEvents.length - 1];
    if (latest.type === 'video_changed') return;

    const eventId = `${latest.type}-${latest.timestamp}`;
    if (lastProcessedEventId.current === eventId) return;
    lastProcessedEventId.current = eventId;

    if (latest.type === 'video_play') {
      isSyncingRef.current = true; 
      setPlaying(true);
      playerRef.current?.seekTo(latest.position, 'seconds');
      setTimeout(() => { isSyncingRef.current = false; }, 1500); 
    } else if (latest.type === 'video_pause') {
      isSyncingRef.current = true;
      setPlaying(false);
      playerRef.current?.seekTo(latest.position, 'seconds');
      setTimeout(() => { isSyncingRef.current = false; }, 1500);
    } else if (latest.type === 'video_seek') {
      isSyncingRef.current = true;
      setPlaying(false);
      playerRef.current?.seekTo(latest.position, 'seconds');
      setTimeout(() => { isSyncingRef.current = false; }, 1500);
    }
  }, [videoEvents, videoType]);

  // 🔥 ИСПРАВЛЕНИЕ: Игнорируем onPlay, если это программный запуск после seekTo
  const handlePlay = () => {
    if (isSyncingRef.current) return; 
    setPlaying(true);
    if (isHost) onPlay(playerRef.current?.getCurrentTime() || 0);
  };

  // 🔥 ИСПРАВЛЕНИЕ: Игнорируем onPause, если это программная пауза после seekTo
  const handlePause = () => {
    if (isSyncingRef.current) return; 
    setPlaying(false);
    if (isHost) onPause(playerRef.current?.getCurrentTime() || 0);
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isHost) return;
    
    // Если мы в режиме синхронизации, просто обновляем время, но НЕ вызываем onSeek!
    if (isSyncingRef.current) {
      lastTimeRef.current = state.playedSeconds;
      return;
    }

    const currentTime = state.playedSeconds;
    const diff = Math.abs(currentTime - lastTimeRef.current);
    
    if (lastTimeRef.current > 0 && diff > 1.5) {
      console.log('🔀 Хост перемотал видео на:', currentTime.toFixed(2));
      onSeek(currentTime);
    }
    lastTimeRef.current = currentTime;
  };

  if (videoType === 'rutube') {
    const rutubeId = extractRutubeId(url);
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
      <ReactPlayer
        key={url}
        ref={playerRef}
        url={url}
        playing={playing}
        controls={isHost}
        onPlay={handlePlay}      // 🔥 Теперь безопасно
        onPause={handlePause}    // 🔥 Теперь безопасно
        onProgress={handleProgress} 
        progressInterval={200}
        width="100%"
        height="100%"
        config={{ youtube: { playerVars: { modestbranding: 1, rel: 0 } } }}
      />
      {!isHost && <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">🔄 Синхронизировано с хостом</div>}
    </div>
  );
}
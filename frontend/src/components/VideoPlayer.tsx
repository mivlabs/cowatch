import { useRef, useEffect, useState } from 'react';
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
  const match =
    url.match(/rutube\.ru\/video\/([a-f0-9]{32})/i) ||
    url.match(/rutube\.ru\/play\/embed\/([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

// ─── Rutube Player с ЗАЩИТОЙ от бесконечного цикла ───────────────────
function RutubePlayer({ videoId, videoEvents, onPlay, onPause, onSeek, isHost }: {
  videoId: string;
  videoEvents: VideoEvent[];
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  isHost: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef('');

  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  // 🔥 Функция для безопасной установки таймера синхронизации
  const blockSync = (ms = 2000) => {
    isSyncingRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      isSyncingRef.current = false;
    }, ms);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'player:changeState') {
          const state = data.data?.state;
          if (isSyncingRef.current) return; // 🔥 Игнорируем, если мы сами инициировали действие

          if (state === 'playing') onPlayRef.current(currentTimeRef.current);
          else if (state === 'paused' || state === 'pause') onPauseRef.current(currentTimeRef.current);
        }

        if (data.type === 'player:currentTime') {
          const newTime = data.data?.time || 0;
          
          // 🔥 Если мы в режиме синхронизации, просто обновляем время и ВЫХОДИМ, не вызывая onSeek!
          if (isSyncingRef.current) {
            lastTimeRef.current = newTime;
            currentTimeRef.current = newTime;
            return;
          }

          const diff = Math.abs(newTime - lastTimeRef.current);
          
          if (lastTimeRef.current > 0 && diff > 1.5 && isHost) {
            console.log('🔀 Rutube: Хост перемотал на', newTime.toFixed(2), 'diff:', diff.toFixed(2));
            
            // 🔥 КРИТИЧЕСКИ ВАЖНО: Блокируем обратную связь НЕМЕДЛЕННО, чтобы iframe не вызвал новый цикл
            blockSync(2500); // 2.5 секунды тишины после перемотки
            
            onSeekRef.current(newTime);
          }
          
          lastTimeRef.current = newTime;
          currentTimeRef.current = newTime;
        }
      } catch {
        // Игнорируем не-JSON сообщения
      }
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
    
    // Игнорируем смену видео здесь, это обрабатывается через key
    if (latest.type === 'video_changed') return;

    const eventId = `${latest.type}-${latest.timestamp}`;
    if (eventId === lastEventRef.current) return; // Уже обработали это событие
    
    lastEventRef.current = eventId; // Запоминаем ТОЛЬКО после проверки

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // 🔥 Блокируем входящие сообщения от iframe на 2 секунды после нашей команды
    blockSync(2000);

    if (latest.type === 'video_play') {
      iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:play' }), '*');
    } else if (latest.type === 'video_pause') {
      iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:pause' }), '*');
    } else if (latest.type === 'video_seek') {
      iframe.contentWindow.postMessage(
        JSON.stringify({ type: 'player:setCurrentTime', data: { time: latest.position } }),
        '*'
      );
    }
  }, [videoEvents]);

  return (
    <iframe
      key={videoId} // Пересоздаем iframe при смене видео
      ref={iframeRef}
      src={`https://rutube.ru/play/embed/${videoId}`}
      className="w-full h-full"
      frameBorder="0"
      allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      title="Rutube Video"
    />
  );
}

// ─── Основной компонент VideoPlayer ────────────────────────
export function VideoPlayer({ url, isHost, videoEvents, onPlay, onPause, onSeek }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const lastEventRef = useRef('');
  const lastTimeRef = useRef(0);
  
  console.log('🎥 VideoPlayer получил URL:', url);
  
  if (!url || url.trim() === '') {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <VideoPlaceholder isHost={isHost} />
      </div>
    );
  }

  const videoType = getVideoType(url);

  // 🔥 ЭФФЕКТ: Реакция только на Play/Pause/Seek (ИГНОРИРУЕМ video_changed)
  useEffect(() => {
    if (videoType === 'rutube') return;
    if (videoEvents.length === 0) return;

    const latest = videoEvents[videoEvents.length - 1];
    if (latest.type === 'video_changed') return;

    const eventId = `${latest.type}-${latest.timestamp}`;
    if (eventId === lastEventRef.current) return;
    lastEventRef.current = eventId;

    if (latest.type === 'video_play') {
      setPlaying(true);
      playerRef.current?.seekTo(latest.position, 'seconds');
    } else if (latest.type === 'video_pause') {
      setPlaying(false);
      playerRef.current?.seekTo(latest.position, 'seconds');
    } else if (latest.type === 'video_seek') {
      setPlaying(false);
      playerRef.current?.seekTo(latest.position, 'seconds');
    }
  }, [videoEvents, videoType]);

  const handlePlay = () => {
    setPlaying(true);
    if (isHost) onPlay(playerRef.current?.getCurrentTime() || 0);
  };

  const handlePause = () => {
    setPlaying(false);
    if (isHost) onPause(playerRef.current?.getCurrentTime() || 0);
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isHost) return;
    
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
    if (!rutubeId) {
      return (
        <div className="flex-1 flex items-center justify-center bg-black text-white">
          <p>Неверная ссылка на Rutube</p>
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
        />
        {!isHost && (
          <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
            🔄 Синхронизировано с хостом
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black relative">
      <ReactPlayer
        key={url} // Магия React: пересоздание плеера при смене URL
        ref={playerRef}
        url={url}
        playing={playing}
        controls={isHost}
        onPlay={handlePlay}
        onPause={handlePause}
        onProgress={handleProgress}
        progressInterval={200}
        width="100%"
        height="100%"
        config={{ youtube: { playerVars: { modestbranding: 1, rel: 0 } } }}
      />
      {!isHost && (
        <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
          🔄 Синхронизировано с хостом
        </div>
      )}
    </div>
  );
}
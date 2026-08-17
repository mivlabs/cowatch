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

// ─── Rutube Player с детекцией перемотки ───────────────────
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
  const lastTimeRef = useRef(0); // 🔥 Для детекции перемотки
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef('');

  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'player:changeState') {
          const state = data.data?.state;
          if (isSyncingRef.current) return;

          if (state === 'playing') onPlayRef.current(currentTimeRef.current);
          else if (state === 'paused' || state === 'pause') onPauseRef.current(currentTimeRef.current);
        }

        // 🔥 Отслеживаем currentTime для детекции перемотки
        if (data.type === 'player:currentTime') {
          const newTime = data.data?.time || 0;
          const diff = Math.abs(newTime - lastTimeRef.current);
          
          // Если время прыгнуло больше чем на 1.5 секунды — это перемотка!
          if (lastTimeRef.current > 0 && diff > 1.5 && isHost && !isSyncingRef.current) {
            console.log('🔀 Rutube: Хост перемотал на', newTime.toFixed(2), 'diff:', diff.toFixed(2));
            onSeekRef.current(newTime);
          }
          
          lastTimeRef.current = newTime;
          currentTimeRef.current = newTime;
        }
      } catch {
        // Игнорируем не-JSON
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
    const eventId = `${latest.type}-${latest.timestamp}`;
    if (eventId === lastEventRef.current) return;
    lastEventRef.current = eventId;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    isSyncingRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => { isSyncingRef.current = false; }, 1500);

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
  const lastTimeRef = useRef(0); // 🔥 ДЛЯ ДЕТЕКЦИИ ПЕРЕМОТКИ
  
  const [localUrl, setLocalUrl] = useState(url);
  console.log('🎥 VideoPlayer получил URL:', url, 'localUrl:', localUrl);
  
  // Обновляем локальный URL при изменении props
  useEffect(() => {
    setLocalUrl(url);
  }, [url]);
  
  // 🔥 Слушаем событие video_changed из WebSocket
  useEffect(() => {
    const changedEvent = videoEvents.findLast((msg): msg is VideoChangedEvent => 
      msg.type === 'video_changed'
    );
    
    if (changedEvent && changedEvent.url !== localUrl) {
      console.log('🎬 Видео изменилось:', changedEvent.url);
      setLocalUrl(changedEvent.url);
      
      // Сбрасываем состояние плеера
      setPlaying(false);
      lastTimeRef.current = 0;
    }
  }, [videoEvents, localUrl]);

    // 🔥 Если видео не выбрано — показываем заглушку
  if (!localUrl || localUrl.trim() === '') {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <VideoPlaceholder isHost={isHost} />
      </div>
    );
  }

  const videoType = getVideoType(localUrl);

  // 1. Реакция на события от других участников
  useEffect(() => {
    if (videoType === 'rutube') return;
    if (videoEvents.length === 0) return;

    const latest = videoEvents[videoEvents.length - 1];
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
      // При перемотке сначала ставим на паузу, чтобы не было глюков, потом мотаем
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

  // 🔥 ГЛАВНАЯ МАГИЯ: Детекция перемотки по скачку времени
  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isHost) return;
    
    const currentTime = state.playedSeconds;
    const diff = Math.abs(currentTime - lastTimeRef.current);
    
    // Логируем каждый вызов для отладки
    console.log(`📊 Прогресс: ${currentTime.toFixed(2)}s, diff: ${diff.toFixed(2)}s`);
    
    // Если время прыгнуло больше чем на 1.5 секунды, это точно перемотка ползунком!
    if (lastTimeRef.current > 0 && diff > 1.5) {
      console.log('🔀 Хост перемотал видео на:', currentTime.toFixed(2));
      onSeek(currentTime);
    }
    lastTimeRef.current = currentTime;
  };

  if (videoType === 'rutube') {
    const rutubeId = extractRutubeId(localUrl);
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
          onSeek={onSeek}  // 🔥 Передаём onSeek
          isHost={isHost}  // 🔥 Передаём isHost
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
        ref={playerRef}
        url={localUrl}
        playing={playing}
        controls={isHost}
        onPlay={handlePlay}
        onPause={handlePause}
        onProgress={handleProgress} // 🔥 Подключаем детектор перемотки
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
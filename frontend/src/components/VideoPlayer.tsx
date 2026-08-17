import { useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { VideoPlaceholder } from './VideoPlaceholder';

interface VideoPlayerProps {
  url: string;
  isHost: boolean;
  // Мы временно игнорируем videoEvents, чтобы проверить, в них ли дело
  videoEvents?: any[]; 
  onPlay?: (position: number) => void;
  onPause?: (position: number) => void;
  onSeek?: (position: number) => void;
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

export function VideoPlayer({ url, isHost, onPlay, onPause, onSeek }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const lastTimeRef = useRef(0);

  if (!url || url.trim() === '') {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <VideoPlaceholder isHost={isHost} />
      </div>
    );
  }

  const videoType = getVideoType(url);

  const handlePlay = () => {
    setPlaying(true);
    if (isHost && onPlay) onPlay(playerRef.current?.getCurrentTime() || 0);
  };

  const handlePause = () => {
    setPlaying(false);
    if (isHost && onPause) onPause(playerRef.current?.getCurrentTime() || 0);
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isHost || !onSeek) return;
    const currentTime = state.playedSeconds;
    const diff = Math.abs(currentTime - lastTimeRef.current);
    
    if (lastTimeRef.current > 0 && diff > 1.5) {
      console.log('🔀 Хост перемотал видео на:', currentTime.toFixed(2));
      onSeek(currentTime);
    }
    lastTimeRef.current = currentTime;
  };

  // 🔥 Если это Rutube, пока просто показываем iframe без сложной синхронизации
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
        <iframe
          key={rutubeId}
          src={`https://rutube.ru/play/embed/${rutubeId}`}
          className="w-full h-full"
          frameBorder="0"
          allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 🔥 Для YouTube и других: чистый плеер без useEffect, слушающих videoEvents
  return (
    <div className="flex-1 flex items-center justify-center bg-black relative">
      <ReactPlayer
        key={url} // Ключ гарантирует пересоздание при смене URL
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
    </div>
  );
}
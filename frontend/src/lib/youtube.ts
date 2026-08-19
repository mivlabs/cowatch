import type { YTPlayerInstance } from '@/types/youtube';

const YT_SCRIPT_ID = 'youtube-iframe-api';
const YT_SCRIPT_SRC = 'https://www.youtube.com/iframe_api';

let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve) => {
    const existingCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      resolve();
    };

    if (!document.getElementById(YT_SCRIPT_ID)) {
      const tag = document.createElement('script');
      tag.id = YT_SCRIPT_ID;
      tag.src = YT_SCRIPT_SRC;
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
}

export function getYouTubeOrigin(): string {
  return window.location.origin;
}

export function createYouTubePlayer(
  container: HTMLElement,
  videoId: string,
  options: {
    isHost: boolean;
    onReady: (player: YTPlayerInstance) => void;
    onStateChange: (state: number, player: YTPlayerInstance) => void;
  },
): YTPlayerInstance {
  return new window.YT!.Player(container, {
    videoId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: options.isHost ? 1 : 0,
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      origin: getYouTubeOrigin(),
      disablekb: options.isHost ? 0 : 1,
      fs: options.isHost ? 1 : 0,
    },
    events: {
      onReady: (event) => options.onReady(event.target),
      onStateChange: (event) => options.onStateChange(event.data, event.target),
    },
  });
}

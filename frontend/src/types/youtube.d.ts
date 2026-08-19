export interface YTPlayerConfig {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
    onError?: (event: { data: number }) => void;
  };
}

export interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
  cueVideoById(videoId: string): void;
  loadVideoById(videoId: string): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: YTPlayerConfig,
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
      loaded?: number;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};

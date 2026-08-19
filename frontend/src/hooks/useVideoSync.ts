import { useRef, useEffect, useCallback } from 'react';
import type { VideoEvent, VideoChangedEvent, VideoStateSnapshot } from '@/hooks/useRoomWebSocket';

export interface VideoSyncInitialState {
  position: number;
  isPlaying: boolean;
}

export interface SyncablePlayer {
  play(position: number): void;
  pause(position: number): void;
  seek(position: number): void;
  getCurrentTime(): number;
}

interface UseVideoSyncOptions {
  isHost: boolean;
  isPlayerReady: boolean;
  player: SyncablePlayer | null;
  videoEvents: (VideoEvent | VideoChangedEvent | VideoStateSnapshot)[];
  initialState?: VideoSyncInitialState;
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  seekDetectionThreshold?: number;
  seekPollIntervalMs?: number;
}

const SYNC_GUARD_MS = 1500;

function isPlaybackEvent(
  event: VideoEvent | VideoChangedEvent | VideoStateSnapshot,
): event is VideoEvent | VideoStateSnapshot {
  return (
    event.type === 'video_play' ||
    event.type === 'video_pause' ||
    event.type === 'video_seek' ||
    event.type === 'video_state'
  );
}

function eventKey(event: VideoEvent | VideoChangedEvent | VideoStateSnapshot): string {
  return `${event.type}-${event.timestamp}`;
}

function applyRemoteState(
  player: SyncablePlayer,
  event: VideoEvent | VideoStateSnapshot,
): void {
  if (event.type === 'video_play' || (event.type === 'video_state' && event.is_playing)) {
    player.seek(event.position);
    player.play(event.position);
    return;
  }

  if (event.type === 'video_pause' || (event.type === 'video_state' && !event.is_playing)) {
    player.seek(event.position);
    player.pause(event.position);
    return;
  }

  if (event.type === 'video_seek') {
    player.seek(event.position);
  }
}

export function useVideoSync({
  isHost,
  isPlayerReady,
  player,
  videoEvents,
  initialState,
  onPlay,
  onPause,
  onSeek,
  seekDetectionThreshold = 1.5,
  seekPollIntervalMs = 800,
}: UseVideoSyncOptions) {
  const isSyncingRef = useRef(false);
  const syncGuardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedEventKeyRef = useRef<string | null>(null);
  const lastHostTimeRef = useRef(0);
  const hasAppliedInitialStateRef = useRef(false);
  const pendingEventRef = useRef<VideoEvent | VideoStateSnapshot | null>(null);

  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);

  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onSeekRef.current = onSeek;

  const beginSyncGuard = useCallback((durationMs = SYNC_GUARD_MS) => {
    isSyncingRef.current = true;
    if (syncGuardTimeoutRef.current) {
      clearTimeout(syncGuardTimeoutRef.current);
    }
    syncGuardTimeoutRef.current = setTimeout(() => {
      isSyncingRef.current = false;
      syncGuardTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const applyRemoteEvent = useCallback(
    (event: VideoEvent | VideoStateSnapshot) => {
      if (!player || !isPlayerReady) {
        pendingEventRef.current = event;
        return;
      }

      const key = eventKey(event);
      if (lastProcessedEventKeyRef.current === key) {
        return;
      }
      lastProcessedEventKeyRef.current = key;

      beginSyncGuard();
      applyRemoteState(player, event);

      if (!isHost) {
        lastHostTimeRef.current = event.position;
      }
    },
    [beginSyncGuard, isHost, isPlayerReady, player],
  );

  // Apply initial room/WS snapshot once the player is ready (fixes guest join desync)
  useEffect(() => {
    if (isHost || !isPlayerReady || !player || hasAppliedInitialStateRef.current) {
      return;
    }

    const latestPlaybackEvent = [...videoEvents]
      .reverse()
      .find((event) => isPlaybackEvent(event)) as VideoEvent | VideoStateSnapshot | undefined;

    if (latestPlaybackEvent) {
      hasAppliedInitialStateRef.current = true;
      applyRemoteEvent(latestPlaybackEvent);
      return;
    }

    if (initialState) {
      hasAppliedInitialStateRef.current = true;
      applyRemoteEvent({
        type: 'video_state',
        position: initialState.position,
        is_playing: initialState.isPlaying,
        timestamp: 'initial',
      });
    }
  }, [applyRemoteEvent, initialState, isHost, isPlayerReady, player, videoEvents]);

  // Drain pending event after player becomes ready
  useEffect(() => {
    if (!isPlayerReady || !player || !pendingEventRef.current) {
      return;
    }

    const pending = pendingEventRef.current;
    pendingEventRef.current = null;
    applyRemoteEvent(pending);
  }, [applyRemoteEvent, isPlayerReady, player]);

  // React to incoming WS events (guests only — host ignores own broadcasts)
  useEffect(() => {
    if (isHost || videoEvents.length === 0) {
      return;
    }

    const latest = videoEvents[videoEvents.length - 1];
    if (!isPlaybackEvent(latest)) {
      return;
    }

    applyRemoteEvent(latest);
  }, [applyRemoteEvent, isHost, videoEvents]);

  // Host: detect play/pause via player callbacks (wired in component)
  const handleHostStateChange = useCallback(
    (isPlaying: boolean, position: number) => {
      if (!isHost || isSyncingRef.current) {
        lastHostTimeRef.current = position;
        return;
      }

      if (isPlaying) {
        onPlayRef.current(position);
      } else {
        onPauseRef.current(position);
      }
      lastHostTimeRef.current = position;
    },
    [isHost],
  );

  // Host: detect seeks via time polling (YouTube/Rutube lack a seek event)
  useEffect(() => {
    if (!isHost || !isPlayerReady || !player) {
      return;
    }

    const interval = setInterval(() => {
      if (isSyncingRef.current) {
        return;
      }

      const currentTime = player.getCurrentTime();
      const diff = Math.abs(currentTime - lastHostTimeRef.current);

      if (lastHostTimeRef.current > 0 && diff > seekDetectionThreshold) {
        beginSyncGuard(2000);
        onSeekRef.current(currentTime);
      }

      lastHostTimeRef.current = currentTime;
    }, seekPollIntervalMs);

    return () => clearInterval(interval);
  }, [
    beginSyncGuard,
    isHost,
    isPlayerReady,
    player,
    seekDetectionThreshold,
    seekPollIntervalMs,
  ]);

  useEffect(() => {
    return () => {
      if (syncGuardTimeoutRef.current) {
        clearTimeout(syncGuardTimeoutRef.current);
      }
    };
  }, []);

  const isSyncing = useCallback(() => isSyncingRef.current, []);

  return {
    handleHostStateChange,
    isSyncing,
  };
}

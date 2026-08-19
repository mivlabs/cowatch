import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  type: 'chat_message';
  content: string;
  user_id: number;
  username: string;
  timestamp: string;
}

export interface VideoEvent {
  type: 'video_play' | 'video_pause' | 'video_seek';
  user_id: number;
  position: number;
  timestamp: string;
}

export interface VideoChangedEvent {
  type: 'video_changed';
  url: string;
  title?: string;
  timestamp: string;
}

export interface VideoStateSnapshot {
  type: 'video_state';
  position: number;
  is_playing: boolean;
  timestamp: string;
}

export interface VideoReaction {
  type: 'video_reaction';
  emoji: string;
  user_id: number;
  username: string;
  timestamp: string;
}

export interface SystemMessage {
  type: 'system';
  content: string;
  timestamp: string;
}

export interface ConnectionMessage {
  type: 'connected';
  message: string;
  is_host?: boolean;
  user_id?: number;
  username?: string;
}

export type WSMessage =
  | ChatMessage
  | VideoEvent
  | VideoChangedEvent
  | VideoStateSnapshot
  | VideoReaction
  | SystemMessage
  | ConnectionMessage;

export type VideoSyncMessage = VideoEvent | VideoChangedEvent | VideoStateSnapshot;

interface UseRoomWebSocketOptions {
  code: string;
  userId: number;
  username: string;
}

function isVideoSyncMessage(message: WSMessage): message is VideoSyncMessage {
  return (
    message.type === 'video_play' ||
    message.type === 'video_pause' ||
    message.type === 'video_seek' ||
    message.type === 'video_changed' ||
    message.type === 'video_state'
  );
}

function isDuplicateMessage(prev: WSMessage | undefined, next: WSMessage): boolean {
  if (!prev || !('timestamp' in prev) || !('timestamp' in next)) {
    return false;
  }
  return prev.type === next.type && prev.timestamp === next.timestamp;
}

export function useRoomWebSocket({ code, userId, username }: UseRoomWebSocketOptions) {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [videoEvents, setVideoEvents] = useState<VideoSyncMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesRef = useRef<WSMessage[]>([]);
  const videoEventsRef = useRef<VideoSyncMessage[]>([]);

  useEffect(() => {
    if (!code) {
      return;
    }

    const token = localStorage.getItem('cowatch_token') || '';
    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8003';
    const wsUrl = `${wsBaseUrl}/rooms/ws/${code}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        const lastMessage = messagesRef.current[messagesRef.current.length - 1];

        if (isDuplicateMessage(lastMessage, data)) {
          return;
        }

        if (data.type === 'connected' && 'is_host' in data) {
          setIsHost(Boolean(data.is_host));
        }

        messagesRef.current = [...messagesRef.current, data];
        setMessages(messagesRef.current);

        if (isVideoSyncMessage(data)) {
          const lastVideoEvent = videoEventsRef.current[videoEventsRef.current.length - 1];
          if (!isDuplicateMessage(lastVideoEvent, data)) {
            videoEventsRef.current = [...videoEventsRef.current, data];
            setVideoEvents(videoEventsRef.current);
          }
        }
      } catch {
        const systemMsg: SystemMessage = {
          type: 'system',
          content: event.data,
          timestamp: new Date().toISOString(),
        };
        messagesRef.current = [...messagesRef.current, systemMsg];
        setMessages(messagesRef.current);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [code]);

  const sendChatMessage = useCallback(
    (content: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      const message: ChatMessage = {
        type: 'chat_message',
        content,
        user_id: userId,
        username,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(message));
    },
    [userId, username],
  );

  const sendVideoEvent = useCallback(
    (type: 'video_play' | 'video_pause' | 'video_seek', position: number) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      const event: VideoEvent = {
        type,
        user_id: userId,
        position,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(event));
    },
    [userId],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      const reaction: VideoReaction = {
        type: 'video_reaction',
        emoji,
        user_id: userId,
        username,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(reaction));
    },
    [userId, username],
  );

  return {
    messages,
    videoEvents,
    isConnected,
    sendChatMessage,
    sendVideoEvent,
    sendReaction,
    isHost,
  };
}

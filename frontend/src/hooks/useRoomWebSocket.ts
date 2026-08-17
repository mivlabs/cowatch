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
}

// 🔥 ЕДИНОЕ объявление типа (никаких дубликатов!)
export type WSMessage = ChatMessage | VideoEvent | VideoChangedEvent | VideoReaction | SystemMessage | ConnectionMessage;

interface UseRoomWebSocketOptions {
  code: string;
  userId: number;
  username: string;
}

export function useRoomWebSocket({ code, userId, username }: UseRoomWebSocketOptions) {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cowatch_token') || '';
    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8003';
    const wsUrl = `${wsBaseUrl}/rooms/ws/${code}?token=${encodeURIComponent(token)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('✅ WebSocket подключен к комнате', code);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        
        if (data.type === 'connected' && 'is_host' in data) {
          setIsHost(data.is_host || false);
          console.log('👑 Хост статус получен:', data.is_host);
        }
        
        setMessages((prev) => [...prev, data]);
      } catch {
        setMessages((prev) => [...prev, {
          type: 'system',
          content: event.data,
          timestamp: new Date().toISOString(),
        }]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('🔴 WebSocket отключен');
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket ошибка:', error);
    };

    return () => {
      ws.close();
    };
  }, [code]);

  const sendChatMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: ChatMessage = {
        type: 'chat_message',
        content,
        user_id: userId,
        username,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [userId, username]);

  const sendVideoEvent = useCallback((type: 'video_play' | 'video_pause' | 'video_seek', position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const event: VideoEvent = {
        type,
        user_id: userId,
        position,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(event));
    }
  }, [userId]);

  // 🔥 ОТПРАВКА РЕАКЦИЙ
  const sendReaction = useCallback((emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const reaction: VideoReaction = {
        type: 'video_reaction',
        emoji,
        user_id: userId,
        username,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(reaction));
    }
  }, [userId, username]);

  return { messages, isConnected, sendChatMessage, sendVideoEvent, sendReaction, isHost };
}
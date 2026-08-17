import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, MessageSquare, Send, Copy, Wifi, WifiOff } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';

import { api } from '@/lib/api';
import type { Room } from '@/types/room';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useRoomWebSocket, 
  type VideoEvent, 
  type VideoChangedEvent, 
  type VideoReaction 
} from '@/hooks/useRoomWebSocket';

export function RoomPage() {
  console.count('🔄 [RoomPage] RENDER'); // <-- ДОБАВИТЬ ЭТУ СТРОКУ
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeReactions, setActiveReactions] = useState<VideoReaction[]>([]);
  const processedReactionIds = useRef(new Set<string>());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const { messages, isConnected, sendChatMessage, sendVideoEvent, sendReaction, isHost } = useRoomWebSocket({
    code: code || '',
    userId: user?.id || 1,
    username: user?.username || 'User',
  });

  const { data: room, isLoading, error } = useQuery<Room>({
    queryKey: ['room', code],
    queryFn: async () => {
      const response = await api.get<Room>(`/rooms/${code}`);
      return response.data;
    },
    enabled: !!code,
  });

  useEffect(() => {
    const newReactions = messages.filter((msg): msg is VideoReaction => msg.type === 'video_reaction');
    const uniqueNewReactions = newReactions.filter((r) => {
      const id = `${r.user_id}-${r.timestamp}`;
      if (processedReactionIds.current.has(id)) return false;
      processedReactionIds.current.add(id);
      return true;
    });

    if (uniqueNewReactions.length > 0) {
      setActiveReactions((prev) => [...prev, ...uniqueNewReactions]);
    }
  }, [messages]);

  // 🔥 ИСПРАВЛЕНИЕ 2: Безопасная очистка реакций
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveReactions(prev => {
        const filtered = prev.filter(r => now - new Date(r.timestamp).getTime() < 3000);
        if (filtered.length === prev.length) return prev; // Не вызываем рендер, если ничего не удалилось
        return filtered;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReaction = (emoji: string) => {
    if (!user) return;
    sendReaction(emoji);
    
    const reaction: VideoReaction = {
      type: 'video_reaction',
      emoji,
      user_id: user.id,
      username: user.username,
      timestamp: new Date().toISOString(),
    };
    setActiveReactions(prev => [...prev, reaction]);
  };

  const [videoEvents, setVideoEvents] = useState<(VideoEvent | VideoChangedEvent)[]>([]);

  // 🔥 НОВОЕ: Слушаем только новые видео-события и добавляем их в стейт
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Берем только последнее сообщение
    const lastMessage = messages[messages.length - 1];
    
    const isVideoEvent = 
      lastMessage.type === 'video_play' || 
      lastMessage.type === 'video_pause' || 
      lastMessage.type === 'video_seek' || 
      lastMessage.type === 'video_changed';

    if (isVideoEvent) {
      setVideoEvents((prev) => {
        // Проверяем, есть ли уже это событие (защита от дубликатов)
        const exists = prev.some(
          (e) => e.timestamp === lastMessage.timestamp && e.type === lastMessage.type
        );
        if (exists) return prev; // Если есть, не вызываем ре-рендер!
        
        return [...prev, lastMessage as VideoEvent | VideoChangedEvent];
      });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleCopyCode = () => {
    if (code) navigator.clipboard.writeText(code);
  };

  const handleVideoPlay = (position: number) => sendVideoEvent('video_play', position);
  const handleVideoPause = (position: number) => sendVideoEvent('video_pause', position);
  const handleVideoSeek = (position: number) => sendVideoEvent('video_seek', position);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Загружаю комнату...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Комната не найдена</h2>
        <p className="text-muted-foreground mb-6">Код "{code}" не существует</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary rounded-xl font-semibold">
          На главную
        </button>
      </div>
    );
  }

  const videoUrl = room.current_movie_url || '';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-white/10 p-4 flex items-center justify-between bg-muted/30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{room.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{room.code}</span>
              <button onClick={handleCopyCode} className="hover:text-primary transition-colors" title="Копировать код">
                <Copy className="w-3 h-3" />
              </button>
              {isHost && (
                <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">Хост</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Online' : 'Offline'}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-medium">
            <Users className="w-4 h-4" />
            {room.participants_count} / {room.max_participants}
          </div>
        </div>
      </header>

      {isHost && (
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            
            setIsSubmitting(true);
            const formData = new FormData(e.currentTarget);
            const url = formData.get('videoUrl') as string;
            
            if (!url.trim()) {
              setIsSubmitting(false);
              return;
            }
            
            try {
              // 1. Отправляем запрос на сервер
              await api.patch(`/rooms/${code}/video`, { url: url.trim() });
              
              // 🔥 МАГИЯ: Обновляем кэш ПРЯМО ЗДЕСЬ, без сетевого refetch, который вызывал цикл!
              queryClient.setQueryData(['room', code], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  current_movie_url: url.trim(),
                  current_position: 0,
                  is_playing: false
                };
              });
              
              (e.target as HTMLFormElement).reset();
            } catch (err) {
              console.error('Ошибка обновления видео:', err);
              alert('Не удалось обновить видео');
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="border-b border-white/10 p-3 bg-muted/20 flex gap-2 items-center"
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">🎬 Сменить видео:</span>
          <input
            name="videoUrl"
            type="text"
            placeholder="Вставь ссылку на YouTube или Rutube..."
            className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Загрузка...' : 'Загрузить'}
          </button>
        </form>
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative bg-black flex flex-col">
          <VideoPlayer
            url={videoUrl}
            isHost={isHost}
            videoEvents={videoEvents}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onSeek={handleVideoSeek}
          />
          
          <ReactionOverlay reactions={activeReactions} />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 z-30">
            {['❤️', '🔥', '😂', '😮', '👏'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1"
                title="Отправить реакцию"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96 border-l border-white/10 bg-muted/20 flex flex-col">
          <div className="flex border-b border-white/10">
            <button className="flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /> Чат
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {messages.filter(msg => msg.type === 'chat_message' || msg.type === 'system' || msg.type === 'connected').map((msg, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {msg.type === 'system' || msg.type === 'connected' ? (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      {msg.type === 'connected' ? msg.message : msg.content}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Avatar username={msg.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            {msg.username}
                          </span>
                          <span className="text-[10px] text-muted-foreground opacity-50">
                            {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-muted/50 p-2.5 rounded-lg rounded-tl-none text-sm break-words">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                placeholder={isConnected ? "Написать сообщение..." : "Подключение..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={!isConnected}
                className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!isConnected || !chatInput.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
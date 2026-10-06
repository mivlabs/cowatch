import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { WSMessage } from '@/hooks/useRoomWebSocket';

interface TgChatProps {
  messages: WSMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  isConnected: boolean;
  currentUsername?: string;
}

/** Phone-sized room chat: fills the space under the player, input pinned at the bottom. */
export function TgChat({ messages, chatInput, onChatInputChange, onSend, isConnected, currentUsername }: TgChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visible = messages.filter(
    (msg) => msg.type === 'chat_message' || msg.type === 'system' || msg.type === 'connected',
  );
  const hasChat = visible.some((msg) => msg.type === 'chat_message');

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [visible.length]);

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-line" aria-label="Чат комнаты">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ol className="grid gap-2.5">
          {visible.map((msg, index) => {
            if (msg.type === 'system' || msg.type === 'connected') {
              return (
                <li key={index} className="text-center font-mono text-[11px] leading-relaxed text-cream-dim">
                  {msg.type === 'connected' ? msg.message : msg.content}
                </li>
              );
            }
            const mine = msg.username === currentUsername;
            return (
              <li key={index} className="grid gap-0.5">
                <div className="flex items-baseline gap-2">
                  <b className={cn('font-mono text-[11px] font-medium tracking-[0.06em]', mine ? 'text-cream-dim' : 'text-gold')}>
                    {msg.username}
                  </b>
                  <time dateTime={msg.timestamp} className="font-mono text-[10px] text-cream-dim/70">
                    {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <p className="break-words text-[15px] leading-snug">{msg.content}</p>
              </li>
            );
          })}
        </ol>
        {!hasChat && <p className="mt-4 text-center text-sm text-cream-dim">Тут пока тихо. Напишите первым.</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSend} className="flex border-t border-line bg-ink">
        <input
          id="tg-chat-message"
          type="text"
          aria-label="Сообщение в чат"
          placeholder={isConnected ? 'Написать в чат' : 'Подключаемся…'}
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          disabled={!isConnected}
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] text-cream outline-none placeholder:text-cream-dim/70 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !chatInput.trim()}
          aria-label="Отправить"
          className="bg-cream px-4 font-pixel text-sm text-ink transition-opacity disabled:opacity-60"
        >
          ОТПР
        </button>
      </form>
    </section>
  );
}

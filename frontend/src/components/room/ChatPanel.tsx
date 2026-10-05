import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { WSMessage } from '@/hooks/useRoomWebSocket';

interface ChatPanelProps {
  messages: WSMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  isConnected: boolean;
  code: string;
  /** Own messages get a quieter name colour, everyone else's is gold. */
  currentUsername?: string;
}

/** Room chat in a small pixel-framed window. */
export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
  { messages, chatInput, onChatInputChange, onSend, isConnected, code, currentUsername },
  messagesEndRef,
) {
  const visibleMessages = messages.filter(
    (msg) => msg.type === 'chat_message' || msg.type === 'system' || msg.type === 'connected',
  );
  const hasChat = visibleMessages.some((msg) => msg.type === 'chat_message');

  return (
    <aside className="flex h-[55vh] min-h-[360px] w-full shrink-0 flex-col px-4 pb-4 md:px-6 md:pb-6 lg:h-auto lg:w-[380px] lg:pl-0 lg:pt-6">
      <section className="cw-win flex min-h-0 flex-1 flex-col" aria-label="Чат комнаты">
        <div className="cw-win-bar">
          <span>чат</span>
          <span className="tracking-[0.2em]">{code}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ol className="grid gap-3">
            {visibleMessages.map((msg, index) => {
              if (msg.type === 'system' || msg.type === 'connected') {
                return (
                  <li key={index} className="text-center font-mono text-xs leading-relaxed text-cream-dim">
                    {msg.type === 'connected' ? msg.message : msg.content}
                  </li>
                );
              }

              const mine = msg.username === currentUsername;
              return (
                <li key={index} className="grid gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <b
                      className={cn(
                        'font-mono text-xs font-medium tracking-[0.06em]',
                        mine ? 'text-cream-dim' : 'text-gold',
                      )}
                    >
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
          {!hasChat && (
            <p className="mt-6 text-center text-sm text-cream-dim">Тут пока тихо. Напишите первым.</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onSend} className="flex border-t-2 border-cream">
          <input
            id="chat-message"
            type="text"
            aria-label="Сообщение в чат"
            placeholder={isConnected ? 'Написать в чат' : 'Подключаемся…'}
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            disabled={!isConnected}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] text-cream outline-none placeholder:text-cream-dim/70 focus-visible:bg-ink/50 disabled:opacity-50"
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
    </aside>
  );
});

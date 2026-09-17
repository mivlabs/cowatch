import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import type { WSMessage } from '@/hooks/useRoomWebSocket';

interface ChatPanelProps {
  messages: WSMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  isConnected: boolean;
}

const NAME_ACCENTS = [
  'var(--color-accent-cyan)',
  'var(--color-accent-magenta)',
  'var(--color-brand-amber)',
];

function accentForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_ACCENTS[Math.abs(hash) % NAME_ACCENTS.length];
}

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
  { messages, chatInput, onChatInputChange, onSend, isConnected },
  messagesEndRef,
) {
  const visibleMessages = messages.filter(
    (msg) => msg.type === 'chat_message' || msg.type === 'system' || msg.type === 'connected',
  );

  return (
    <div className="flex h-[40vh] w-full flex-col border-t border-[var(--color-border-subtle)] bg-white/[0.04] lg:h-auto lg:w-[360px] lg:border-l lg:border-t-0">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-5 py-[18px]">
        <MessageSquare className="size-4 text-[var(--color-text-secondary)]" />
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">Чат комнаты</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
        <AnimatePresence>
          {visibleMessages.map((msg, index) => {
            if (msg.type === 'system' || msg.type === 'connected') {
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-2 text-center text-xs text-[var(--color-text-muted)]"
                >
                  {msg.type === 'connected' ? msg.message : msg.content}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <Avatar username={msg.username} size="sm" />
                  <span className="text-xs font-medium" style={{ color: accentForName(msg.username) }}>
                    {msg.username}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="w-fit max-w-[240px] break-words rounded-2xl bg-[var(--color-bg-elevated)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]">
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSend} className="flex shrink-0 items-center gap-2.5 border-t border-[var(--color-border-subtle)] px-4 py-4 md:px-5">
        <input
          type="text"
          placeholder={isConnected ? 'Написать сообщение…' : 'Подключение…'}
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          disabled={!isConnected}
          className="min-w-0 flex-1 rounded-full bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-opacity focus:ring-2 focus:ring-[var(--color-accent-cyan)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !chatInput.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#1a1a24] transition-opacity disabled:opacity-40"
          style={{ backgroundImage: 'linear-gradient(1deg, #fafaff 5.66%, #adb2d9 52.83%, #d9dbf2 100%)' }}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
});

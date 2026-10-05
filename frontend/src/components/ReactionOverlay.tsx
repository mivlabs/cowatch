import { motion, AnimatePresence } from 'framer-motion';
import type { VideoReaction } from '@/hooks/useRoomWebSocket';
import { reactionGlyph } from '@/lib/utils';

// Стабильное смещение по X для каждой реакции (от -30px до +30px), чтобы эмодзи
// не летели одной линией и не дёргались при перерисовке списка.
function offsetFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 61) - 30;
}

interface ReactionOverlayProps {
  reactions: VideoReaction[];
}

export function ReactionOverlay({ reactions }: ReactionOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {reactions.map((reaction) => {
          const key = `${reaction.timestamp}-${reaction.user_id}`;
          const randomX = offsetFor(key);
          
          return (
            <motion.div
              key={key}
              initial={{ 
                y: 0, 
                x: randomX, 
                opacity: 1, 
                scale: 0.5 
              }}
              animate={{ 
                y: -200, // Летит вверх на 200px
                opacity: 0, 
                scale: 1.5 
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.5, 
                ease: "easeOut" 
              }}
              className="cw-emoji absolute bottom-10 left-1/2 text-4xl text-cream [text-shadow:0_2px_10px_rgb(7_10_28/0.8)]"
              style={{ marginLeft: randomX }}
            >
              {reactionGlyph(reaction.emoji)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
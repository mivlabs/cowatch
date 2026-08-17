import { motion, AnimatePresence } from 'framer-motion';
import type { VideoReaction } from '@/hooks/useRoomWebSocket';

interface ReactionOverlayProps {
  reactions: VideoReaction[];
}

export function ReactionOverlay({ reactions }: ReactionOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {reactions.map((reaction) => {
          // Генерируем случайное смещение по X, чтобы эмодзи не летели одной линией
          const randomX = Math.random() * 60 - 30; // от -30px до +30px
          
          return (
            <motion.div
              key={`${reaction.timestamp}-${reaction.user_id}`}
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
              className="absolute bottom-10 left-1/2 text-4xl filter drop-shadow-lg"
              style={{ marginLeft: randomX }}
            >
              {reaction.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
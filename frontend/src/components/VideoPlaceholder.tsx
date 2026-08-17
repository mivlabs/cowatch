import { motion } from 'framer-motion';
import { Film, Link as LinkIcon, Coffee } from 'lucide-react';

interface VideoPlaceholderProps {
  isHost: boolean;
}

export function VideoPlaceholder({ isHost }: VideoPlaceholderProps) {
  return (
    // 🔥 w-full h-full min-h-[500px] гарантирует, что блок займет всё доступное место и не схлопнется
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20 relative overflow-hidden p-8">
      
      {/* Фоновые анимированные круги */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-md w-full"
      >
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 mb-8 shadow-xl"
        >
          {isHost ? (
            <LinkIcon className="w-12 h-12 text-purple-400" />
          ) : (
            <Coffee className="w-12 h-12 text-blue-400" />
          )}
        </motion.div>

        <h2 className="text-3xl font-bold mb-4 text-foreground">
          {isHost ? 'Видео пока не выбрано' : 'Комната ожидает'}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {isHost 
            ? 'Вставьте ссылку на YouTube или Rutube в поле выше, чтобы начать совместный просмотр'
            : 'Хост ещё не выбрал видео. Самое время заварить чай или кофе ☕'
          }
        </p>

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-sm font-medium text-purple-300"
          >
            <Film className="w-4 h-4" />
            Поддерживаются YouTube и Rutube
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
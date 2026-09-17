import { motion } from 'framer-motion';
import { Film, Link as LinkIcon, Popcorn } from 'lucide-react';

interface VideoPlaceholderProps {
  isHost: boolean;
}

export function VideoPlaceholder({ isHost }: VideoPlaceholderProps) {
  return (
    // 🔥 w-full h-full min-h-[500px] гарантирует, что блок займет всё доступное место и не схлопнется
    <div className="relative flex h-full min-h-[500px] w-full items-center justify-center overflow-hidden bg-[var(--color-bg-base)] p-8">

      {/* Фоновые анимированные пятна */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/3 size-64 animate-pulse rounded-full bg-[var(--color-accent-cyan)]/10 blur-3xl" />
        <div
          className="absolute bottom-1/3 right-1/3 size-64 animate-pulse rounded-full bg-[var(--color-brand-amber)]/10 blur-3xl"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mb-8 inline-flex size-24 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] shadow-xl backdrop-blur-md"
        >
          {isHost ? (
            <LinkIcon className="size-12 text-[var(--color-accent-cyan)]" />
          ) : (
            <Popcorn className="size-12 text-[var(--color-brand-amber)]" />
          )}
        </motion.div>

        <h2 className="mb-4 text-3xl font-bold text-[var(--color-text-primary)]">
          {isHost ? 'Видео пока не выбрано' : 'Комната ожидает'}
        </h2>

        <p className="mb-8 text-lg leading-relaxed text-[var(--color-text-secondary)]">
          {isHost
            ? 'Вставьте ссылку на YouTube или Rutube в поле выше, чтобы начать совместный просмотр'
            : 'Хост ещё не выбрал видео. Запасаемся попкорном!'}
        </p>

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/10 px-5 py-2.5 text-sm font-medium text-[var(--color-accent-cyan)]"
          >
            <Film className="size-4" />
            Поддерживаются YouTube и Rutube
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

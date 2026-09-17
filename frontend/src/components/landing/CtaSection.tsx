import { motion } from 'framer-motion';
import { AuroraBackground } from '@/components/AuroraBackground';

interface CtaSectionProps {
  onCreateRoom: () => void;
  onJoinAsGuest: () => void;
}

export function CtaSection({ onCreateRoom, onJoinAsGuest }: CtaSectionProps) {
  return (
    <section className="relative flex flex-col items-center justify-center gap-8 overflow-hidden px-6 pb-24 pt-24 text-center md:px-16 md:pb-[160px] md:pt-[140px]">
      <AuroraBackground variant="cta" />

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-[680px] text-3xl font-bold leading-tight text-[var(--color-text-primary)] md:text-[44px]"
      >
        Соберите свою комнату
        <br />
        прямо сейчас
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative text-base text-[var(--color-text-secondary)] md:text-[17px]"
      >
        Бесплатно. Без установки. Первое видео можно включить за 30 секунд.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative flex flex-col items-center gap-4 sm:flex-row"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateRoom}
          className="rounded-full bg-[linear-gradient(1deg,_#fafaff_6%,_#c7ccdb_39%,_#8c8fb8_58%,_#d9dbf2_76%,_#a6a8cc_100%)] px-10 py-5 text-[17px] font-semibold text-[#14141f] shadow-[0_10px_30px_-4px_rgba(125,59,237,0.4)] ring-1 ring-inset ring-white/60"
        >
          Создать комнату
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onJoinAsGuest}
          className="rounded-full border border-white/25 bg-white/10 px-10 py-5 text-[17px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.18]"
        >
          Войти как гость
        </motion.button>
      </motion.div>
    </section>
  );
}

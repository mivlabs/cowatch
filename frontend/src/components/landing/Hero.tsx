import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { AuroraBackground } from '@/components/AuroraBackground';

interface HeroProps {
  onCreateRoom: () => void;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onJoin: (e: React.FormEvent) => void;
}

export function Hero({ onCreateRoom, roomCode, onRoomCodeChange, onJoin }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center gap-7 overflow-hidden px-6 py-24 text-center md:px-16 md:py-[140px]">
      <AuroraBackground variant="hero" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2"
      >
        <span className="size-2 rounded-full bg-[var(--color-accent-cyan)] shadow-[0_0_10px_1px_var(--color-accent-cyan)]" />
        <p className="text-[13px] font-medium tracking-[0.04em] text-[var(--color-text-primary)]">
          СИНХРОНИЗАЦИЯ &lt; 100 МС
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative"
      >
        <Logo size="lg" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative max-w-[820px] text-[40px] font-bold leading-[1.08] text-[var(--color-text-primary)] md:text-[64px]"
      >
        Смотрим вместе.
        <br />
        Реально вместе.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative max-w-[560px] text-base text-[var(--color-text-secondary)] md:text-[19px]"
      >
        CoWatch синхронизирует видео между вами и друзьями в реальном времени.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative flex flex-col items-center gap-3 sm:flex-row"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateRoom}
          className="rounded-full bg-[linear-gradient(1deg,_#fafaff_6%,_#c7ccdb_39%,_#8c8fb8_58%,_#d9dbf2_76%,_#a6a8cc_100%)] px-8 py-4 text-base font-semibold text-[#14141f] shadow-[0_8px_24px_-4px_rgba(125,59,237,0.35)] ring-1 ring-inset ring-white/60 transition-shadow hover:shadow-[0_8px_28px_-2px_rgba(125,59,237,0.5)]"
        >
          Создать комнату
        </motion.button>

        {/* Room-code join form kept from the previous homepage — not part of the
           Figma marketing mock, but dropping it would remove working functionality. */}
        <form onSubmit={onJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="Код комнаты"
            value={roomCode}
            onChange={(e) => onRoomCodeChange(e.target.value)}
            maxLength={6}
            className="w-36 rounded-full border border-white/25 bg-white/10 px-4 py-4 text-center font-mono uppercase tracking-widest text-white placeholder:text-[var(--color-text-secondary)] placeholder:normal-case placeholder:tracking-normal placeholder:font-sans outline-none transition-colors focus:border-[var(--color-accent-cyan)] focus:bg-white/[0.14] focus:ring-2 focus:ring-[var(--color-accent-cyan)]/50"
          />
          {/* Deliberate secondary action (same weight as "Войти как гость" in
             the final CTA) — visible outline instead of the near-invisible
             border it had before. */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="rounded-full border border-white/25 bg-white/10 px-6 py-4 font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.18]"
          >
            Войти
          </motion.button>
        </form>
      </motion.div>
    </section>
  );
}

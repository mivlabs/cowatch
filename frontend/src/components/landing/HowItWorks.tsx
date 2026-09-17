import { motion } from 'framer-motion';
import { AuroraBackground } from '@/components/AuroraBackground';

const STEPS = [
  {
    icon: '🎬',
    accent: 'var(--color-accent-cyan)',
    glow: 'rgba(76,224,210,0.45)',
    title: 'Создайте комнату',
    desc: 'Вставьте ссылку на видео — CoWatch создаст приватную комнату за секунду.',
  },
  {
    icon: '🔗',
    accent: 'var(--color-accent-magenta)',
    glow: 'rgba(255,95,168,0.4)',
    title: 'Скиньте ссылку друзьям',
    desc: 'Отправьте ссылку в чат. Гостевой вход — без регистрации и паролей.',
  },
  {
    icon: '🍿',
    accent: 'var(--color-brand-amber)',
    glow: 'rgba(255,193,104,0.4)',
    title: 'Смотрите вместе',
    desc: 'Плеер синхронизируется у всех в реальном времени с задержкой до 100 мс.',
  },
];

export function HowItWorks() {
  return (
    <section className="relative flex flex-col items-center gap-16 overflow-hidden bg-[var(--color-bg-surface)] px-6 py-24 md:px-16 md:py-[120px]">
      <AuroraBackground variant="process" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] font-semibold tracking-[0.15em] text-[var(--color-accent-cyan)]">ПРОЦЕСС</p>
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] md:text-[40px]">Как это работает</h2>
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -6 }}
            className="group relative flex min-w-0 flex-1 flex-col items-start gap-4 overflow-hidden rounded-3xl border border-white/10 bg-[var(--color-bg-elevated)] px-7 py-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] transition-colors duration-300 hover:border-white/20"
          >
            {/* Solid, clearly-bounded card fill (not a faint white overlay) so
               each step reads as its own block against the section bg. */}
            <span
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ backgroundColor: step.accent }}
              aria-hidden
            />
            <div
              className="flex size-12 items-center justify-center rounded-2xl text-[22px] shadow-[0_0_28px_var(--glow)] transition-shadow duration-300"
              style={{ backgroundColor: step.accent, ['--glow' as string]: step.glow }}
            >
              {step.icon}
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{step.desc}</p>

            {/* Connector to the next step — visually ties the 3 cards together
               into one process instead of three isolated boxes (desktop only). */}
            {i < STEPS.length - 1 && (
              <span
                className="pointer-events-none absolute right-[-30px] top-1/2 hidden -translate-y-1/2 text-2xl text-white/20 md:block"
                aria-hidden
              >
                →
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

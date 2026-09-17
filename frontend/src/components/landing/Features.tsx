import { motion } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AuroraBackground } from '@/components/AuroraBackground';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  className?: string;
  accent: string;
  icon: string;
  iconSize?: string;
  title: string;
  titleSize?: string;
  desc: string;
  descSize?: string;
  children?: React.ReactNode;
}

function FeatureCard({
  className,
  accent,
  icon,
  iconSize = 'size-11 text-lg',
  title,
  titleSize = 'text-lg',
  desc,
  descSize = 'text-sm',
  children,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative flex flex-col items-start gap-3.5 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-6',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-16 -top-16 size-52 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className={cn('relative flex items-center justify-center rounded-2xl text-black', iconSize)} style={{ backgroundColor: accent }}>
        {icon}
      </div>
      <h3 className={cn('relative font-semibold text-[var(--color-text-primary)]', titleSize)}>{title}</h3>
      <p className={cn('relative leading-relaxed text-[var(--color-text-secondary)]', descSize)}>{desc}</p>
      {children}
    </motion.div>
  );
}

export function Features() {
  return (
    <section className="relative flex flex-col items-center gap-14 overflow-hidden bg-[var(--color-bg-base)] px-6 py-24 md:px-16 md:py-[120px]">
      <AuroraBackground variant="features" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] font-semibold tracking-[0.15em] text-[var(--color-accent-cyan)]">ВОЗМОЖНОСТИ</p>
        <h2 className="max-w-[640px] text-3xl font-bold text-[var(--color-text-primary)] md:text-[40px]">
          Всё для идеального совместного просмотра
        </h2>
      </div>

      {/* Mobile: single column stack. Desktop (md+): 4-col/2-row bento grid matching Figma. */}
      <div className="grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-4 md:grid-rows-2">
        <FeatureCard
          className="md:col-span-2 md:row-span-2 md:py-10 md:pl-9 md:pr-9"
          accent="var(--color-accent-cyan)"
          icon="🔗"
          iconSize="size-[60px] text-2xl"
          title="Комнаты по ссылке или коду"
          titleSize="text-2xl md:text-[26px]"
          desc="Создайте комнату и отправьте друзьям короткую ссылку или 5-значный код — они попадут в неё за секунду."
          descSize="text-base"
        >
          <div className="relative mt-2 flex w-full items-center gap-3 rounded-2xl bg-[var(--color-bg-elevated)] px-5 py-4">
            <p className="flex-1 truncate text-[15px] text-[var(--color-text-muted)]">cowatch.app/room/8F3K2</p>
            <span className="shrink-0 rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
              Скопировано ✓
            </span>
          </div>

          <div className="relative flex w-full flex-1 items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-text-primary)] p-2.5">
              <QRCodeSVG
                value="https://cowatch.app/room/8F3K2"
                size={84}
                bgColor="transparent"
                fgColor="#0a0a0f"
                level="M"
              />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">Или отсканируйте QR</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Друг рядом? Наведите камеру телефона — и он в комнате.
              </p>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          className="md:col-start-3 md:row-span-2"
          accent="var(--color-brand-amber)"
          icon="🎬"
          title="Что посмотреть дальше"
          titleSize="text-xl"
          desc="Учитываем историю совместных просмотров и подбираем следующий фильм для вашей компании."
        >
          <div className="relative flex w-full flex-col gap-2">
            {[
              { title: 'Дюна: Часть вторая', color: 'var(--color-brand-amber)' },
              { title: 'Всё везде и сразу', color: 'var(--color-accent-magenta)' },
              { title: 'Интерстеллар', color: 'var(--color-accent-cyan)' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-elevated)] px-2.5 py-2">
                <div
                  className="flex h-11 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: item.color }}
                >
                  <Clapperboard className="size-4 text-black/50" />
                </div>
                <p className="truncate text-[13px] text-[var(--color-text-primary)]">{item.title}</p>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard
          className="md:col-start-4 md:row-start-1"
          accent="var(--color-accent-cyan)"
          icon="💬"
          iconSize="size-11 text-lg"
          title="Живой чат"
          desc="Обсуждайте сцены, не выходя из комнаты."
        >
          <div className="relative flex w-full flex-col gap-1.5">
            <div className="w-fit rounded-xl bg-[var(--color-bg-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
              ору с этой сцены хахахахах
            </div>
            <div className="w-fit rounded-xl bg-[var(--color-bg-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
              тссс, смотрим
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          className="md:col-start-4 md:row-start-2"
          accent="var(--color-accent-magenta)"
          icon="🏆"
          iconSize="size-11 text-lg"
          title="Ачивки"
          desc="Получай награды за активность в комнатах."
        >
          <div className="relative flex w-full items-center gap-2 rounded-full border border-[var(--color-accent-magenta)]/30 bg-[var(--color-accent-magenta)]/15 py-2 pl-3 pr-3.5">
            <span className="text-sm">🎉</span>
            <p className="flex-1 text-xs font-medium text-[var(--color-text-primary)]">
              Первый совместный просмотр — получено
            </p>
          </div>
        </FeatureCard>
      </div>
    </section>
  );
}

import { NightSky } from '@/components/brand/NightSky';
import { CatSticker } from '@/components/brand/CatSticker';

interface CtaSectionProps {
  onCreateRoom: () => void;
  onJoinAsGuest: () => void;
}

export function CtaSection({ onCreateRoom, onJoinAsGuest }: CtaSectionProps) {
  return (
    <section className="relative overflow-hidden rounded border border-line">
      <NightSky seed={11} stars={24} glowFrom={{ x: 0.7, y: 0 }} />
      <div className="relative grid items-center gap-8 px-6 py-12 md:grid-cols-[1fr_auto] md:px-12 md:py-16">
        <div className="grid gap-5">
          <h2 className="font-display text-[clamp(40px,6vw,64px)] font-medium italic leading-[1.02] text-balance">
            Соберите свою комнату прямо&nbsp;сейчас
          </h2>
          <p className="max-w-[52ch] text-cream-dim">
            Бесплатно и без установки. Друзьям хватит кода, гостям регистрация не нужна.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onCreateRoom} className="cw-btn cw-btn-primary">
              Создать комнату
            </button>
            <button type="button" onClick={onJoinAsGuest} className="cw-btn cw-btn-line">
              Войти как гость
            </button>
          </div>
        </div>
        <CatSticker pose="wave" width={190} className="justify-self-center md:justify-self-end" />
      </div>
    </section>
  );
}

import { NightSky } from '@/components/brand/NightSky';
import { MoonCat } from '@/components/brand/MoonCat';

interface HeroProps {
  nav: React.ReactNode;
  onCreateRoom: () => void;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onJoin: (e: React.FormEvent) => void;
}

export function Hero({ nav, onCreateRoom, roomCode, onRoomCodeChange, onJoin }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <NightSky glowFrom={{ x: 0.62, y: 0.1 }} />
      {/* Small in the bottom corner on phones and tablets, where it can't reach the text. */}
      <MoonCat className="pointer-events-none absolute -bottom-[50px] -right-6 w-[130px] lg:-bottom-[110px] lg:-right-10 lg:w-[380px]" />

      <div className="relative mx-auto grid min-h-[560px] max-w-[1040px] grid-rows-[auto_1fr] gap-16 px-4 pb-14 pt-7">
        {nav}

        <div className="grid max-w-[640px] gap-7 self-end">
          <span className="cw-label">Совместный просмотр · YouTube, Rutube, прямые ссылки</span>
          <h1 className="font-display text-[clamp(56px,10vw,112px)] font-medium italic leading-[1.02] text-balance">
            Одно кино на&nbsp;всех, где бы вы ни&nbsp;были
          </h1>
          <p className="text-lg text-cream-dim">
            Создайте комнату, отправьте друзьям код из шести символов, и плеер пойдёт у всех одновременно.
          </p>
          <div className="flex flex-wrap items-stretch gap-3">
            <button type="button" onClick={onCreateRoom} className="cw-btn cw-btn-primary">
              Создать комнату
            </button>
            <form onSubmit={onJoin} className="flex flex-wrap items-stretch gap-3">
              <input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => onRoomCodeChange(e.target.value)}
                maxLength={6}
                placeholder="Код"
                aria-label="Код комнаты"
                autoComplete="off"
                className="cw-code-input"
              />
              <button type="submit" className="cw-btn cw-btn-line">
                Войти
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

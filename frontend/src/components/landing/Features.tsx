import { NightSky } from '@/components/brand/NightSky';
import { StarSticker } from '@/components/brand/StarSticker';
import { PlateHeader } from '@/components/landing/PlateHeader';

// Text on top, example pinned to the bottom, so titles line up across a row.
function Panel({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-5 rounded border border-line bg-night p-5">
      <div className="grid gap-1.5">
        <h3 className="font-display text-[26px] font-medium italic leading-[1.05]">{title}</h3>
        <p className="text-sm text-cream-dim">{text}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  );
}

const POSTERS = [
  { title: 'Интерстеллар', seed: 3 },
  { title: 'Дюна: Часть вторая', seed: 7 },
  { title: 'Ведьмина служба доставки', seed: 11 },
];

export function Features() {
  return (
    <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
      <PlateHeader label="Что внутри" title={<>Всё для вечера вместе</>} />

      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Panel title="Комната по коду" text="Код из шести символов или ссылка. Хватит одного сообщения в чат с друзьями.">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-4 py-3">
            <span className="font-mono text-lg tracking-[0.3em] text-gold">K7QM2X</span>
            <span className="cw-label">ссылка скопирована</span>
          </div>
        </Panel>

        <Panel title="Чат и реакции" text="Обсуждайте сцены прямо во время фильма, не ставя его на паузу.">
          <div className="cw-win" aria-hidden>
            <div className="cw-win-bar">
              <span>чат</span>
              <span className="tracking-[0.3em]">_ □ ×</span>
            </div>
            <div className="grid gap-2 p-3 text-sm">
              <p>
                <b className="font-mono text-xs font-medium text-gold">лёва </b>подождите, я за чаем
              </p>
              <p>
                <b className="font-mono text-xs font-medium text-cream-dim">маша </b>ждём, сейчас будет та самая сцена
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Ачивки" text="Награды за совместные просмотры и активность в комнатах.">
          <div className="flex items-center gap-4 rounded border border-dashed border-line p-4">
            <StarSticker size={56} />
            <div className="grid gap-0.5">
              <span className="cw-label">Новая ачивка</span>
              <span className="font-display text-xl italic leading-tight">Первый совместный просмотр</span>
            </div>
          </div>
        </Panel>

        <Panel title="Что посмотреть дальше" text="Подбираем следующий фильм по истории ваших просмотров.">
          <ul className="grid gap-2" aria-hidden>
            {POSTERS.map((poster) => (
              <li key={poster.title} className="flex items-center gap-3">
                <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm border border-line">
                  <NightSky seed={poster.seed} stars={3} dense />
                </div>
                <span className="truncate font-display text-lg italic">{poster.title}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

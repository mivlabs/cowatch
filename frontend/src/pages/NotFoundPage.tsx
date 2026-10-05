import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { NightSky } from '@/components/brand/NightSky';
import { MoonCat } from '@/components/brand/MoonCat';

/** Any address the app doesn't know: the cat on the moon is looking for it too. */
export function NotFoundPage() {
  return (
    <div className="relative min-h-screen text-cream">
      <NightSky seed={404} glowFrom={{ x: 0.62, y: 0.12 }} className="fixed" />

      <div className="relative mx-auto grid min-h-screen max-w-[1040px] grid-rows-[auto_1fr] gap-10 px-4 pb-16 pt-7">
        <nav aria-label="Главное меню" className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/" aria-label="CoWatch, на главную" className="mr-auto">
            <Logo />
          </Link>
          <Link
            to="/"
            className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-cream transition-colors hover:text-gold"
          >
            На главную
          </Link>
        </nav>

        <main className="grid items-center gap-8 md:grid-cols-[1fr_minmax(0,340px)]">
          <div className="grid max-w-[560px] gap-6">
            <span className="font-mono text-sm tracking-[0.3em] text-gold">404</span>
            <h1 className="font-display text-[clamp(48px,8vw,88px)] font-medium italic leading-[1.02] text-balance">
              Такой страницы нет
            </h1>
            <p className="text-lg text-cream-dim">
              Похоже, ссылка устарела или в адресе опечатка. Котик тоже её ищет.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="cw-btn cw-btn-primary">
                На главную
              </Link>
              <Link to="/create" className="cw-btn cw-btn-line">
                Создать комнату
              </Link>
            </div>
          </div>
          <MoonCat fullMoon className="mx-auto w-full max-w-[240px] md:max-w-[320px]" />
        </main>
      </div>
    </div>
  );
}

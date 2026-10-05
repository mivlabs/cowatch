import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { NightSky } from '@/components/brand/NightSky';
import { CatSticker } from '@/components/brand/CatSticker';

interface AuthLayoutProps {
  label: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/** Shared frame for the sign-in and sign-up pages: painted sky, a small panel, the waving cat. */
export function AuthLayout({ label, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen text-cream">
      <NightSky seed={17} className="fixed" />

      <div className="relative mx-auto grid max-w-[1040px] gap-10 px-4 pb-24 pt-7">
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

        <main className="mx-auto grid w-full max-w-[440px] gap-7 rounded border border-line bg-night p-6 sm:p-8">
          <header className="grid justify-items-center gap-3 text-center">
            <CatSticker pose="wave" width={84} />
            <span className="cw-label">{label}</span>
            <h1 className="font-display text-[clamp(36px,7vw,48px)] font-medium italic leading-none">{title}</h1>
            <p className="text-cream-dim">{subtitle}</p>
          </header>
          {children}
          <p className="text-center text-sm text-cream-dim">{footer}</p>
        </main>
      </div>
    </div>
  );
}

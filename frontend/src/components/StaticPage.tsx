import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SiteFooter } from '@/components/SiteFooter';
import { NightSky } from '@/components/brand/NightSky';
import { PlateHeader } from '@/components/landing/PlateHeader';

const NAV_LINK = 'font-mono text-xs font-medium uppercase tracking-[0.12em] text-cream transition-colors hover:text-gold';

interface StaticPageProps {
  /** Small mono label above the title, e.g. "О проекте". */
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Keeps each page's painted sky its own. */
  seed: number;
  children: React.ReactNode;
}

/** Shell for text pages (about, privacy): painted header with nav, sections below, footer. */
export function StaticPage({ label, title, lead, seed, children }: StaticPageProps) {
  return (
    <div className="min-h-screen bg-ink pb-24 text-cream">
      <section className="relative overflow-hidden border-b border-line">
        <NightSky seed={seed} stars={28} glowFrom={{ x: 0.65, y: 0.1 }} />
        <div className="relative mx-auto grid max-w-[1040px] gap-12 px-4 pb-12 pt-7">
          <nav aria-label="Главное меню" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to="/" aria-label="CoWatch, на главную" className="mr-auto">
              <Logo />
            </Link>
            <Link to="/" className={NAV_LINK}>
              На главную
            </Link>
            <Link to="/about" className={NAV_LINK}>
              О проекте
            </Link>
            <Link to="/privacy" className={`hidden sm:inline ${NAV_LINK}`}>
              Конфиденциальность
            </Link>
          </nav>

          <header className="grid max-w-[640px] gap-5">
            <span className="cw-label">{label}</span>
            <h1 className="font-display text-[clamp(44px,7vw,80px)] font-medium italic leading-[1.02] text-balance">
              {title}
            </h1>
            {lead && <p className="text-lg text-cream-dim">{lead}</p>}
          </header>
        </div>
      </section>

      <main className="mx-auto mt-[72px] grid max-w-[1040px] gap-[72px] px-4">{children}</main>

      <div className="mt-[88px]">
        <SiteFooter />
      </div>
    </div>
  );
}

interface PageSectionProps {
  label: string;
  title: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}

/** Two-column section of a text page: plate header on the left, running text on the right. */
export function PageSection({ label, title, note, children }: PageSectionProps) {
  return (
    <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
      <PlateHeader label={label} title={title} note={note} />
      <div className="grid min-w-0 max-w-[640px] gap-4 text-[17px] leading-relaxed text-cream">{children}</div>
    </section>
  );
}

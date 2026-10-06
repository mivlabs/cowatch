import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { TmdbLogo } from '@/components/brand/TmdbLogo';
import { CONTACT_EMAIL, CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL } from '@/lib/contacts';

const FOOTER_LINK = 'underline underline-offset-[3px] transition-colors hover:text-gold';

/**
 * Page footer: site links and contacts on the first row, credits on the second.
 * The TMDB attribution is required by the TMDB API terms, the Freepik credit
 * while the Freepik cats are in use.
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto grid max-w-[1040px] gap-5 border-t border-line px-4 pt-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
        <Logo className="mr-auto" />
        <Link to="/about" className={`cw-label ${FOOTER_LINK}`}>
          О проекте
        </Link>
        <Link to="/privacy" className={`cw-label ${FOOTER_LINK}`}>
          Конфиденциальность
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className={`cw-label ${FOOTER_LINK}`}>
          {CONTACT_EMAIL}
        </a>
        <a href={CONTACT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={`cw-label ${FOOTER_LINK}`}>
          Telegram @{CONTACT_TELEGRAM}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="cw-label flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Данные о фильмах:</span>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TMDB, The Movie Database"
            className="transition-opacity hover:opacity-80"
          >
            <TmdbLogo />
          </a>
          <span className="normal-case tracking-normal">
            Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.
          </span>
        </span>
        <span className="cw-label">
          Котики:{' '}
          <a href="https://www.freepik.com" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            Designed by Freepik
          </a>
        </span>
      </div>
    </footer>
  );
}

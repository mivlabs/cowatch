import { Logo } from '@/components/Logo';

/** Page footer. The Freepik credit is required while the Freepik cats are in use. */
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-[1040px] flex-wrap items-baseline gap-x-6 gap-y-3 border-t border-line px-4 pt-8">
      <Logo className="mr-auto" />
      <span className="cw-label">
        Котики:{' '}
        <a
          href="https://www.freepik.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-[3px] transition-colors hover:text-gold"
        >
          Designed by Freepik
        </a>
      </span>
    </footer>
  );
}

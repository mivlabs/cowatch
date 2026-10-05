import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

interface RoomHeaderProps {
  title: string;
  code: string;
  isHost: boolean;
  isConnected: boolean;
  participantsCount: number;
  maxParticipants: number;
  linkCopied: boolean;
  onCopyLink: () => void;
}

export function RoomHeader({
  title,
  code,
  isHost,
  isConnected,
  participantsCount,
  maxParticipants,
  linkCopied,
  onCopyLink,
}: RoomHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 md:px-6">
        <Link to="/" aria-label="CoWatch, на главную" className="shrink-0">
          <Logo />
        </Link>

        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate font-display text-[26px] font-medium italic leading-none">{title}</h1>
          {isHost && (
            <span className="shrink-0 rounded-sm border border-gold/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
              хост
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-sm tracking-[0.3em] text-gold">{code}</span>
          <button type="button" onClick={onCopyLink} className="cw-btn cw-btn-line px-3 py-2 text-[11px]">
            {linkCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>
          <span className="cw-label tabular-nums">
            в зале {participantsCount} из {maxParticipants}
          </span>
          <span className="cw-label flex items-center gap-2" role="status">
            <span className={cn('size-2 rounded-full', isConnected ? 'bg-gold' : 'animate-pulse bg-coral')} aria-hidden />
            {isConnected ? 'В синхроне' : 'Переподключаемся…'}
          </span>
        </div>
      </div>
    </header>
  );
}

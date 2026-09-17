import { ArrowLeft, Users, Wifi, WifiOff } from 'lucide-react';

interface RoomHeaderProps {
  title: string;
  code: string;
  isHost: boolean;
  isConnected: boolean;
  participantsCount: number;
  maxParticipants: number;
  onBack: () => void;
  onCopyCode: () => void;
}

export function RoomHeader({
  title,
  code,
  isHost,
  isConnected,
  participantsCount,
  maxParticipants,
  onBack,
  onCopyCode,
}: RoomHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-white/[0.04] px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onBack}
          className="flex-shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-1.5 md:px-4 md:py-2">
          <span className="text-sm">🔗</span>
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="hidden sm:inline">{title} · </span>
            {code}
          </p>
        </div>

        <button
          onClick={onCopyCode}
          className="hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#14141f] shadow-sm transition-transform hover:scale-[1.03] sm:flex md:px-4 md:py-2"
          style={{
            backgroundImage:
              'linear-gradient(1deg, #fafaff 5.66%, #adb2d9 52.83%, #d9dbf2 100%)',
          }}
        >
          <span>⧉</span>
          <span className="hidden md:inline">Скопировать ссылку</span>
        </button>

        {isHost && (
          <span className="hidden rounded-full bg-[var(--color-accent-cyan)]/20 px-2.5 py-1 text-xs font-medium text-[var(--color-accent-cyan)] sm:inline-block">
            Хост
          </span>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-[var(--color-text-secondary)] sm:flex">
          <Users className="size-4" />
          <span className="text-sm font-medium">
            {participantsCount} / {maxParticipants}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 md:px-4">
          <span
            className="size-2 rounded-full transition-colors"
            style={{
              backgroundColor: isConnected ? 'var(--color-accent-cyan)' : 'var(--color-brand-amber)',
              boxShadow: isConnected
                ? '0 0 8px 1px var(--color-accent-cyan)'
                : '0 0 8px 1px var(--color-brand-amber)',
            }}
          />
          <span className="hidden text-[13px] font-medium text-[var(--color-text-secondary)] sm:inline">
            {isConnected ? 'В синхроне' : 'Переподключение…'}
          </span>
          {isConnected ? (
            <Wifi className="size-4 text-[var(--color-text-secondary)] sm:hidden" />
          ) : (
            <WifiOff className="size-4 text-[var(--color-brand-amber)] sm:hidden" />
          )}
        </div>
      </div>
    </header>
  );
}

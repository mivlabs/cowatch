import { useState } from 'react';
import { Film } from 'lucide-react';

interface MovieBannerProps {
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
}

/**
 * Collapse/expand is pure local UI state — cosmetic only in the Figma comp
 * (no persisted "collapsed" preference on the backend), safe to add without
 * touching any existing logic.
 */
export function MovieBanner({ title, posterPath, releaseYear }: MovieBannerProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(13,13,18,0.65)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] backdrop-blur-md transition-colors hover:bg-[rgba(13,13,18,0.85)]"
      >
        <Film className="size-3.5" />
        {title}
      </button>
    );
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(13,13,18,0.65)] py-2.5 pl-3 pr-4 backdrop-blur-md">
      {posterPath ? (
        <img
          src={`https://image.tmdb.org/t/p/w92${posterPath}`}
          alt={title}
          className="h-12 w-[34px] shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-12 w-[34px] shrink-0 items-center justify-center rounded bg-[var(--color-brand-amber)]">
          <Film className="size-4 text-black/60" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.06em] text-[var(--color-text-secondary)]">СЕЙЧАС СМОТРИТЕ</p>
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
          {releaseYear ? ` (${releaseYear})` : ''}
        </p>
      </div>
      <button
        onClick={() => setCollapsed(true)}
        className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-white/[0.16]"
        title="Свернуть"
      >
        ▾
      </button>
    </div>
  );
}

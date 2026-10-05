import { useState } from 'react';

interface MovieBannerProps {
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
}

/**
 * Collapse/expand is pure local UI state — cosmetic only (no persisted
 * "collapsed" preference on the backend).
 */
export function MovieBanner({ title, posterPath, releaseYear }: MovieBannerProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-sm border border-line bg-ink/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cream transition-colors hover:border-cream"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-sm border border-line bg-ink/85 py-2 pl-2 pr-3">
      {posterPath ? (
        <img
          src={`https://image.tmdb.org/t/p/w92${posterPath}`}
          alt=""
          className="h-12 w-[34px] shrink-0 rounded-sm border border-line object-cover"
        />
      ) : (
        <div className="h-12 w-[34px] shrink-0 rounded-sm border border-line bg-night" />
      )}
      <div className="min-w-0">
        <p className="cw-label">Сейчас смотрите</p>
        <p className="truncate font-display text-lg italic leading-tight">
          {title}
          {releaseYear ? ` · ${releaseYear}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="shrink-0 font-mono text-[11px] text-cream-dim transition-colors hover:text-cream"
      >
        свернуть
      </button>
    </div>
  );
}

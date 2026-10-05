import { cn } from '@/lib/utils';

/** Cream star with a white sticker edge, as on the moodboard. */
export function StarSticker({ size = 70, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('block shrink-0', className)} aria-hidden>
      <path
        d="M50 8 L61 37 L93 38 L68 58 L77 90 L50 72 L23 90 L32 58 L7 38 L39 37 Z"
        fill="#f4e7b8"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

import { useId } from 'react';
import { CATS } from '@/components/brand/cats';

const STAR = 'M50 8 L61 37 L93 38 L68 58 L77 90 L50 72 L23 90 L32 58 L7 38 L39 37 Z';

/**
 * The sitting cat on top of a moon, with two sticker stars. The landing hero
 * crops the moon at the bottom edge; `fullMoon` shows the whole circle.
 */
export function MoonCat({ className, fullMoon = false }: { className?: string; fullMoon?: boolean }) {
  const moonId = useId();
  return (
    <svg viewBox={fullMoon ? '0 0 400 545' : '0 0 400 480'} className={className} role="img" aria-label="Котик сидит на луне">
      <defs>
        <radialGradient id={moonId} cx=".42" cy=".38" r=".7">
          <stop offset="0" stopColor="#e9e6dc" />
          <stop offset=".7" stopColor="#a9b3c9" />
          <stop offset="1" stopColor="#7b88a8" />
        </radialGradient>
      </defs>
      <circle cx="230" cy="370" r="170" fill={`url(#${moonId})`} stroke="#efe4c8" strokeWidth="3" />
      <g opacity=".25" fill="#5d6a8c">
        <circle cx="175" cy="300" r="24" />
        <circle cx="290" cy="262" r="13" />
        <circle cx="318" cy="340" r="32" />
        <circle cx="205" cy="392" r="17" />
      </g>
      <image href={CATS.sit.src} x="132" y="16" width="196" height="215" />
      <g fill="#f4e7b8" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round" paintOrder="stroke">
        <path d={STAR} transform="translate(36 150) rotate(-12) scale(.7)" />
        <path d={STAR} transform="translate(318 96) rotate(10) scale(.49)" />
      </g>
    </svg>
  );
}

import { cn } from '@/lib/utils';

type AuroraVariant = 'hero' | 'features' | 'process' | 'cta';

interface AuroraBackgroundProps {
  className?: string;
  variant?: AuroraVariant;
}

interface Blob {
  color: string;
  size: number;
  top: string;
  left: string;
  duration: string;
  delay: string;
  anim: 'cw-blob-float-a' | 'cw-blob-float-b';
}

// Each variant reorders/repositions the same 4 brand hues so every section
// feels like a distinct moment of one continuous aurora rather than the same
// background tile repeated down the page. Hero stays at full intensity;
// every other section is dialed back ~30-40% so it doesn't fight the card
// content sitting on top of it.
const VARIANTS: Record<AuroraVariant, { blobs: Blob[]; opacityClass: string }> = {
  // Hero: violet + magenta dominant.
  hero: {
    opacityClass: 'opacity-50',
    blobs: [
      { color: 'var(--color-accent-violet)', size: 620, top: '-18%', left: '4%', duration: '26s', delay: '0s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-accent-magenta)', size: 520, top: '-5%', left: '52%', duration: '31s', delay: '-6s', anim: 'cw-blob-float-b' },
      { color: 'var(--color-brand-amber)', size: 460, top: '38%', left: '-6%', duration: '24s', delay: '-12s', anim: 'cw-blob-float-b' },
      { color: 'var(--color-accent-cyan)', size: 500, top: '30%', left: '58%', duration: '29s', delay: '-3s', anim: 'cw-blob-float-a' },
    ],
  },
  // Features ("Возможности"): teal + orange dominant.
  features: {
    opacityClass: 'opacity-[0.32]',
    blobs: [
      { color: 'var(--color-accent-cyan)', size: 560, top: '-14%', left: '58%', duration: '30s', delay: '-4s', anim: 'cw-blob-float-b' },
      { color: 'var(--color-brand-amber)', size: 500, top: '10%', left: '2%', duration: '27s', delay: '-10s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-accent-magenta)', size: 440, top: '55%', left: '48%', duration: '33s', delay: '-2s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-accent-violet)', size: 420, top: '48%', left: '-8%', duration: '25s', delay: '-16s', anim: 'cw-blob-float-b' },
    ],
  },
  // How It Works: the hero mix run in reverse (magenta/amber lead, violet trails).
  process: {
    opacityClass: 'opacity-30',
    blobs: [
      { color: 'var(--color-accent-magenta)', size: 500, top: '5%', left: '10%', duration: '28s', delay: '-8s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-brand-amber)', size: 460, top: '-10%', left: '55%', duration: '32s', delay: '0s', anim: 'cw-blob-float-b' },
      { color: 'var(--color-accent-cyan)', size: 420, top: '50%', left: '60%', duration: '26s', delay: '-14s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-accent-violet)', size: 380, top: '45%', left: '5%', duration: '30s', delay: '-5s', anim: 'cw-blob-float-b' },
    ],
  },
  cta: {
    opacityClass: 'opacity-[0.35]',
    blobs: [
      { color: 'var(--color-accent-violet)', size: 460, top: '-10%', left: '10%', duration: '28s', delay: '0s', anim: 'cw-blob-float-a' },
      { color: 'var(--color-brand-amber)', size: 380, top: '5%', left: '55%', duration: '32s', delay: '-8s', anim: 'cw-blob-float-b' },
      { color: 'var(--color-accent-magenta)', size: 400, top: '20%', left: '20%', duration: '25s', delay: '-14s', anim: 'cw-blob-float-b' },
    ],
  },
};

/**
 * Layered blurred color blobs (screen-blended, slowly drifting) approximating
 * the Figma "Iridescent Oil-Slick" shader — see index.css for why this isn't
 * the literal WebGPU shader. Plus the matching radial vignette that darkens
 * the edges so foreground text stays readable. Each `variant` reshuffles the
 * same 4 hues with a different dominant pair/position so the whole page
 * reads as one continuous aurora instead of a repeated tile as you scroll.
 */
export function AuroraBackground({ className, variant = 'hero' }: AuroraBackgroundProps) {
  const { blobs, opacityClass } = VARIANTS[variant];

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden>
      <div className={cn('absolute inset-0 mix-blend-screen', opacityClass)}>
        {blobs.map((blob, i) => (
          <div
            key={i}
            className="cw-blob absolute rounded-full blur-[100px]"
            style={{
              width: blob.size,
              height: blob.size,
              top: blob.top,
              left: blob.left,
              backgroundColor: blob.color,
              animation: `${blob.anim} ${blob.duration} ease-in-out infinite`,
              animationDelay: blob.delay,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.35)_58%,_rgba(0,0,0,0.94)_100%)]" />
    </div>
  );
}

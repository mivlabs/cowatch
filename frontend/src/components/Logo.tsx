import { cn } from '@/lib/utils';

interface LogoProps {
  /** `lg` is the hero-sized lockup from the landing page; `sm` fits a nav bar. */
  size?: 'sm' | 'lg';
  className?: string;
}

const TEXT_SIZE = {
  sm: 'text-2xl',
  lg: 'text-[76px]',
};

/**
 * CoWatch wordmark with two glass spheres resting on top of it (sync metaphor).
 * The spheres sit behind the text and only blur/tint whatever is behind the
 * whole logo — the letters themselves stay crisp, per the approved Figma comp.
 * Sphere size/position are expressed in `em` so the whole lockup scales with
 * the text size prop instead of needing separate pixel math per size.
 *
 * Horizontal placement: the pair spans from the right edge of "C" to the
 * right edge of "a" in "CoWatch" (covering "oWa"), left-anchored rather than
 * centered on the whole word.
 */
export function Logo({ size = 'lg', className }: LogoProps) {
  return (
    // `em`-sized children (spheres, glow, highlight) resolve against THIS
    // element's own font-size — it has to live here, on the shared ancestor,
    // not on the <span> below. Font-size doesn't cascade sideways to
    // siblings, so putting it only on the text span (previous bug) left every
    // sphere sized off the inherited ~16px body font regardless of `size`,
    // which is why the hero logo's spheres stayed tiny instead of scaling
    // up with the big wordmark.
    <div className={cn('relative inline-flex', TEXT_SIZE[size], className)}>
      {/* Colored glow behind the spheres, bleeding softly onto nearby letters */}
      <div
        className={cn(
          'absolute rounded-full blur-2xl opacity-70 pointer-events-none',
          'w-[2.4em] h-[2.4em] left-[0.4em] top-[-0.56em]',
          'bg-[radial-gradient(circle,_var(--color-accent-cyan)_0%,_var(--color-brand-amber)_45%,_var(--color-accent-magenta)_100%)]',
        )}
        aria-hidden
      />

      {/* Glass sphere 1 — real backdrop-filter glass, not a flat gradient fill */}
      <div
        className={cn(
          'absolute rounded-full pointer-events-none bg-white/[0.14]',
          'w-[1.2em] h-[1.2em] left-[0.7em] top-[0.04em]',
          'border border-white/20 backdrop-blur-[10px]',
          'shadow-[0_0_40px_rgba(76,224,210,0.4)]',
        )}
        aria-hidden
      />
      {/* Glass sphere 2 */}
      <div
        className={cn(
          'absolute rounded-full pointer-events-none bg-white/[0.14]',
          'w-[1.2em] h-[1.2em] left-[1.3em] top-[0.04em]',
          'border border-white/20 backdrop-blur-[10px]',
          'shadow-[0_0_40px_rgba(255,95,168,0.35)]',
        )}
        aria-hidden
      />
      {/* Main specular highlight at the intersection of the two spheres */}
      <div
        className="absolute rounded-full bg-white/90 blur-[2px] pointer-events-none w-[0.19em] h-[0.19em] left-[1.5em] top-[0.4em]"
        aria-hidden
      />
      <div
        className="absolute rounded-full bg-white/40 blur-md pointer-events-none w-[0.46em] h-[0.46em] left-[1.37em] top-[0.27em]"
        aria-hidden
      />

      <span className="relative font-['Space_Grotesk'] font-bold tracking-[-0.01em] text-white">
        CoWatch
      </span>
    </div>
  );
}

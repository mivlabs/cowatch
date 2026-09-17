import { cn } from '@/lib/utils';

interface SphereMarkProps {
  /** Diameter of a single sphere, in px. Both the navbar icon and the Logo's
   * hero-sized graphic render from this one component so they can never drift
   * out of sync — only the size differs. */
  size?: number;
  className?: string;
}

// Two overlapping glass spheres with a bright amber glow where they intersect.
// Ratios are lifted from the approved Figma comp (base case: 300px sphere,
// 14px border) and scaled linearly off `size`.
const OVERLAP_RATIO = 0.35;
const BORDER_RATIO = 14 / 300;
const GLOW_RATIO = 0.3;

const GLASS_GRADIENT =
  'radial-gradient(circle at 36% 30%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 14%, rgba(255,255,255,0.12) 36%, rgba(255,255,255,0) 60%)';

export function SphereMark({ size = 38, className }: SphereMarkProps) {
  const borderWidth = size * BORDER_RATIO;
  const rightOffset = size * (1 - OVERLAP_RATIO);
  const width = size * (2 - OVERLAP_RATIO);
  const glowSize = size * GLOW_RATIO;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width, height: size }} aria-hidden>
      <div
        className="absolute left-0 top-0 rounded-full"
        style={{
          width: size,
          height: size,
          boxSizing: 'border-box',
          borderWidth,
          borderStyle: 'solid',
          borderColor: 'var(--color-accent-cyan)',
          background: GLASS_GRADIENT,
          boxShadow: 'inset 0 0 36px rgba(255,255,255,0.6), 0 0 30px rgba(76,224,210,0.9)',
        }}
      />
      <div
        className="absolute top-0 z-[1] rounded-full"
        style={{
          left: rightOffset,
          width: size,
          height: size,
          boxSizing: 'border-box',
          borderWidth,
          borderStyle: 'solid',
          borderColor: 'var(--color-accent-magenta)',
          background: GLASS_GRADIENT,
          boxShadow: 'inset 0 0 36px rgba(255,255,255,0.6), 0 0 30px rgba(255,95,168,0.9)',
        }}
      />
      <div
        className="absolute z-[2] rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: glowSize,
          height: glowSize,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,225,175,0.85) 40%, rgba(255,193,104,0.35) 68%, rgba(255,193,104,0) 78%)',
        }}
      />
    </div>
  );
}

import { cn } from '@/lib/utils';
import { SphereMark } from '@/components/SphereMark';

interface LogoProps {
  /** `lg` is the hero-sized lockup from the landing page; `sm` fits a nav bar. */
  size?: 'sm' | 'lg';
  className?: string;
}

const TEXT_SIZE_CLASS = {
  sm: 'text-2xl',
  lg: 'text-[76px]',
};

// Pixel value behind each Tailwind text size above — used to derive the
// sphere graphic's size/position so it scales together with the wordmark.
const TEXT_PX = {
  sm: 24,
  lg: 76,
};

// Sphere diameter relative to text height, and how far its left edge sits
// from the start of the text (left-anchored over "oWa", per the Figma comp).
const SPHERE_TO_TEXT_RATIO = 1.3;
const SPHERE_LEFT_TO_TEXT_RATIO = 0.55;

/**
 * CoWatch wordmark with the SphereMark glass-sphere icon resting on top of
 * it (sync metaphor). The spheres sit behind the text and only blur/tint
 * whatever is behind the whole logo — the letters themselves stay crisp.
 * Sphere size/position scale off the text size prop via plain px math
 * instead of separate hand-tuned values per size.
 */
export function Logo({ size = 'lg', className }: LogoProps) {
  const textPx = TEXT_PX[size];
  const sphereDiameter = textPx * SPHERE_TO_TEXT_RATIO;
  const sphereLeft = textPx * SPHERE_LEFT_TO_TEXT_RATIO;

  return (
    <div
      className={cn('relative inline-flex items-center', TEXT_SIZE_CLASS[size], className)}
      style={{ height: sphereDiameter }}
    >
      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: sphereLeft }}>
        <SphereMark size={sphereDiameter} />
      </div>

      <span
        className="relative z-10 font-['Space_Grotesk'] font-bold tracking-[-0.01em] text-white"
        style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
      >
        CoWatch
      </span>
    </div>
  );
}

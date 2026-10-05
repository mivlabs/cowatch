import { cn } from '@/lib/utils';

interface LogoProps {
  /** `lg` for a standalone lockup; `sm` fits a nav bar or footer. */
  size?: 'sm' | 'lg';
  className?: string;
}

/** CoWatch wordmark, set in the italic display face. */
export function Logo({ size = 'sm', className }: LogoProps) {
  return (
    <span
      className={cn(
        'font-display font-semibold italic leading-none text-cream',
        size === 'lg' ? 'text-6xl' : 'text-[26px]',
        className,
      )}
    >
      CoWatch
    </span>
  );
}

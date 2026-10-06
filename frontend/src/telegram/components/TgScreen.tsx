import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { NightSky } from '@/components/brand/NightSky';

interface TgScreenProps {
  children: ReactNode;
  /** Painted sky behind the content; off for the room, where the player needs every pixel. */
  sky?: boolean;
  seed?: number;
  className?: string;
}

/**
 * Full-height Mini App screen. Uses Telegram's viewport and safe-area CSS
 * variables, so content stays clear of the header and the phone's home bar.
 */
export function TgScreen({ children, sky = true, seed = 5, className }: TgScreenProps) {
  return (
    <div className={cn('tg-screen relative flex flex-col text-cream', className)}>
      {sky && <NightSky seed={seed} stars={22} className="fixed" />}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

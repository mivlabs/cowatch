import { cn } from '@/lib/utils';
import { CATS, type CatPose } from '@/components/brand/cats';

interface CatStickerProps {
  pose: CatPose;
  /** Rendered width in px; the height follows the drawing. */
  width: number;
  /** Slow breathing loop, meant for the sleeping cat. Off with reduced motion. */
  breathing?: boolean;
  className?: string;
}

export function CatSticker({ pose, width, breathing, className }: CatStickerProps) {
  const cat = CATS[pose];
  return (
    <img
      src={cat.src}
      alt=""
      width={width}
      height={Math.round(width * cat.ratio)}
      draggable={false}
      className={cn('block h-auto max-w-full select-none', breathing && 'cw-breathe', className)}
    />
  );
}

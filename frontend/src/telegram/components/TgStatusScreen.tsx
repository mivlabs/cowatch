import type { ReactNode } from 'react';
import { CatSticker } from '@/components/brand/CatSticker';
import type { CatPose } from '@/components/brand/cats';
import { TgScreen } from './TgScreen';

interface TgStatusScreenProps {
  pose: CatPose;
  title: string;
  text?: string;
  progress?: boolean;
  children?: ReactNode;
}

/** Loading, error and "open this in Telegram" screens share this layout. */
export function TgStatusScreen({ pose, title, text, progress, children }: TgStatusScreenProps) {
  return (
    <TgScreen seed={13}>
      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="grid w-full max-w-[360px] justify-items-center gap-5 text-center">
          <CatSticker pose={pose} width={180} breathing={pose === 'sleep'} />
          <h1 className="font-display text-[34px] font-medium italic leading-none">{title}</h1>
          {text && <p className="text-cream-dim">{text}</p>}
          {progress && <div className="cw-progress w-48" role="progressbar" aria-label={title} />}
          {children}
        </div>
      </main>
    </TgScreen>
  );
}

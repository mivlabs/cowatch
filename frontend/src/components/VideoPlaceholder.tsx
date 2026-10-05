import { CatSticker } from '@/components/brand/CatSticker';

interface VideoPlaceholderProps {
  isHost: boolean;
}

/** Empty screen before the host picks a video: the sleeping cat waits too. */
export function VideoPlaceholder({ isHost }: VideoPlaceholderProps) {
  return (
    <div className="grid min-h-[300px] w-full flex-1 place-items-center bg-ink p-8 md:min-h-[460px]">
      <div className="grid max-w-[420px] justify-items-center gap-4 text-center">
        <CatSticker pose="sleep" width={200} breathing />
        <h2 className="font-display text-[clamp(32px,4vw,44px)] font-medium italic leading-none">
          {isHost ? 'Включите фильм' : 'Ждём хоста'}
        </h2>
        <p className="text-cream-dim">
          {isHost
            ? 'Вставьте ссылку на YouTube, Rutube или видеофайл в поле над экраном.'
            : 'Как только хост включит видео, оно пойдёт у вас с того же кадра.'}
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CatSticker } from '@/components/brand/CatSticker';

interface GreetingToastProps {
  code: string;
  participantsCount: number;
}

/** Short hello from the waving cat once the room connection is up. Hides itself. */
export function GreetingToast({ code, participantsCount }: GreetingToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div role="status" className="cw-win absolute right-3 top-3 z-30 w-[min(280px,calc(100%-1.5rem))] text-cream">
      <div className="cw-win-bar">
        <span>{code}</span>
        <button type="button" onClick={() => setVisible(false)} aria-label="Закрыть" className="px-1 leading-none">
          ×
        </button>
      </div>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <CatSticker pose="wave" width={56} className="shrink-0" />
        <p className="text-[15px] leading-snug">
          Вы в комнате
          <span className="block font-mono text-xs tracking-[0.06em] text-cream-dim">
            в зале {participantsCount}
          </span>
        </p>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { NightSky } from '@/components/brand/NightSky';

interface AccountSettingsProps {
  isGuest: boolean;
}

/**
 * There's no backend support for changing email/password yet, so this
 * intentionally doesn't render settings that would do nothing. The one real
 * flow here is guest → sign-up, so that's the only state rendered.
 */
export function AccountSettings({ isGuest }: AccountSettingsProps) {
  const navigate = useNavigate();

  if (!isGuest) return null;

  return (
    <section className="relative overflow-hidden rounded border border-line">
      <NightSky seed={29} stars={18} glowFrom={{ x: 0.75, y: 0 }} />
      <div className="relative grid justify-items-start gap-4 px-6 py-10 sm:px-10">
        <h2 className="max-w-[20ch] font-display text-[clamp(32px,5vw,44px)] font-medium italic leading-[1.05]">
          Сохраните свой прогресс
        </h2>
        <p className="max-w-[48ch] text-cream-dim">
          Ачивки и история просмотров сохраняются только в аккаунте, у гостей они не копятся.
        </p>
        <button type="button" onClick={() => navigate('/register')} className="cw-btn cw-btn-primary">
          Зарегистрироваться
        </button>
      </div>
    </section>
  );
}

import { useNavigate } from 'react-router-dom';

interface AccountSettingsProps {
  isGuest: boolean;
}

/**
 * There's no backend support for changing email/password yet, so this
 * intentionally does NOT render the Figma "Настройки аккаунта" block (email +
 * change-password buttons that would do nothing). The one thing that IS real
 * here is the guest → register flow, so that's the only state rendered.
 */
export function AccountSettings({ isGuest }: AccountSettingsProps) {
  const navigate = useNavigate();

  if (!isGuest) return null;

  return (
    <section
      className="flex w-full flex-col items-center gap-5 rounded-3xl border-[1.5px] px-6 py-10 text-center sm:px-10"
      style={{
        borderColor: 'rgba(76,224,210,0.6)',
        backgroundImage:
          'linear-gradient(115deg, rgba(76,224,210,0.16) 14%, rgba(255,193,104,0.12) 50%, rgba(255,94,168,0.16) 86%)',
      }}
    >
      <h2 className="max-w-md text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
        Зарегистрируйтесь, чтобы не потерять прогресс
      </h2>
      <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
        Ачивки, история просмотров и настройки сохранятся навсегда — регистрация занимает 10 секунд.
      </p>
      <button
        onClick={() => navigate('/register')}
        className="rounded-full px-8 py-3.5 text-sm font-semibold text-[#14141f] transition-opacity hover:opacity-90"
        style={{
          backgroundImage: 'linear-gradient(1deg, #fafaff 5.66%, #adb2d9 52.83%, #d9dbf2 100%)',
        }}
      >
        Зарегистрироваться
      </button>
    </section>
  );
}

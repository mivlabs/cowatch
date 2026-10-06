import { useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cowatch_cookie_notice';

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * One-time note about what the browser keeps. CoWatch sets no cookies of its own,
 * but stores the sign-in token in localStorage and embeds players that do set cookies.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(() => !wasDismissed());

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode or blocked storage: the note simply shows again next time.
    }
    setVisible(false);
  };

  return (
    <aside
      aria-label="Уведомление о cookies"
      className="cw-win fixed bottom-3 left-3 z-40 w-[min(360px,calc(100%-1.5rem))] text-cream"
    >
      <div className="cw-win-bar">
        <span>cookies</span>
        <button type="button" onClick={dismiss} aria-label="Закрыть" className="px-1 leading-none">
          ×
        </button>
      </div>
      <div className="grid gap-3 px-3.5 py-3">
        <p className="text-[14px] leading-snug">
          CoWatch не ставит cookies, но хранит в браузере токен входа. Встроенные плееры YouTube и Rutube используют
          свои cookies.{' '}
          <Link to="/privacy" className="text-gold underline underline-offset-[3px] hover:text-cream">
            Подробнее
          </Link>
        </p>
        <button type="button" onClick={dismiss} className="cw-btn cw-btn-primary justify-self-start px-4 py-2.5">
          Понятно
        </button>
      </div>
    </aside>
  );
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  TELEGRAM_CHROME_COLOR,
  isInsideTelegram,
  loadTelegramWebApp,
  shareViaTelegram,
  tryWebApp,
  type TelegramWebApp,
  type TelegramWebAppUser,
} from '@/lib/telegram';
import { TelegramContext, type TelegramContextValue, type TelegramStatus } from './telegramContext';

/**
 * Loads the SDK, tells Telegram the app is ready, and signs the viewer in with
 * initData. Children render only after that, so every screen can rely on a
 * CoWatch token being present.
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const { loginWithTelegram } = useAuth();
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [status, setStatus] = useState<TelegramStatus>('loading');
  const [tgUser, setTgUser] = useState<TelegramWebAppUser | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sdk = await loadTelegramWebApp();
      if (cancelled) return;

      if (!isInsideTelegram(sdk)) {
        setStatus('outside');
        return;
      }

      tryWebApp(() => sdk.ready());
      tryWebApp(() => sdk.expand());
      tryWebApp(() => sdk.setHeaderColor(TELEGRAM_CHROME_COLOR));
      tryWebApp(() => sdk.setBackgroundColor(TELEGRAM_CHROME_COLOR));
      tryWebApp(() => sdk.setBottomBarColor?.(TELEGRAM_CHROME_COLOR));

      setWebApp(sdk);
      setTgUser(sdk.initDataUnsafe.user ?? null);
      setStartParam(sdk.initDataUnsafe.start_param ?? null);
      setStatus('authenticating');

      try {
        await loginWithTelegram(sdk.initData);
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('[Telegram] Вход не удался:', err);
        if (!cancelled) {
          setError('Не получилось войти через Telegram.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // loginWithTelegram is recreated on every AuthProvider render; re-running
    // the launch sequence for that would sign in twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const haptic = useCallback<TelegramContextValue['haptic']>(
    (kind) => {
      if (!webApp) return;
      tryWebApp(() => {
        if (kind === 'tap') webApp.HapticFeedback.impactOccurred('light');
        else if (kind === 'select') webApp.HapticFeedback.selectionChanged();
        else webApp.HapticFeedback.notificationOccurred(kind);
      });
    },
    [webApp],
  );

  const share = useCallback<TelegramContextValue['share']>(
    (url, text) => shareViaTelegram(webApp, url, text),
    [webApp],
  );

  const value = useMemo<TelegramContextValue>(
    () => ({ webApp, status, tgUser, startParam, error, retry, haptic, share }),
    [webApp, status, tgUser, startParam, error, retry, haptic, share],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

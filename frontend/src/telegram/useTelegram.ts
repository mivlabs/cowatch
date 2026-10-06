import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TelegramContext } from './telegramContext';
import { tryWebApp } from '@/lib/telegram';

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
}

/**
 * Telegram's native back button in the header. Pass a destination to show it;
 * the home screen passes null and the button disappears.
 */
export function useTelegramBackButton(to: string | null) {
  const { webApp } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (!webApp || !to) return;
    const handler = () => navigate(to);
    tryWebApp(() => {
      webApp.BackButton.onClick(handler);
      webApp.BackButton.show();
    });
    return () => {
      tryWebApp(() => {
        webApp.BackButton.offClick(handler);
        webApp.BackButton.hide();
      });
    };
  }, [webApp, to, navigate]);
}

/**
 * The big button at the bottom of the Mini App. Shown while the component is
 * mounted, hidden on unmount. `onClick` should be stable (useCallback).
 */
export function useTelegramMainButton(text: string | null, onClick: () => void) {
  const { webApp } = useTelegram();

  useEffect(() => {
    if (!webApp || !text) return;
    tryWebApp(() => {
      webApp.MainButton.setParams({ text, color: '#efe4c8', text_color: '#070a1c', is_active: true, is_visible: true });
      webApp.MainButton.onClick(onClick);
    });
    return () => {
      tryWebApp(() => {
        webApp.MainButton.offClick(onClick);
        webApp.MainButton.hide();
      });
    };
  }, [webApp, text, onClick]);
}

import { createContext } from 'react';
import type { TelegramWebApp, TelegramWebAppUser } from '@/lib/telegram';

export type TelegramStatus = 'loading' | 'outside' | 'authenticating' | 'ready' | 'error';

export interface TelegramContextValue {
  webApp: TelegramWebApp | null;
  status: TelegramStatus;
  /** Who opened the Mini App, as Telegram reports it (unverified on the client, verified by auth). */
  tgUser: TelegramWebAppUser | null;
  /** Deep link payload (t.me/<bot>?startapp=...), consumed once by the router. */
  startParam: string | null;
  error: string | null;
  retry: () => void;
  haptic: (kind: 'tap' | 'select' | 'success' | 'error') => void;
  /** Telegram's own "send to" sheet. */
  share: (url: string, text: string) => void;
}

export const TelegramContext = createContext<TelegramContextValue | undefined>(undefined);

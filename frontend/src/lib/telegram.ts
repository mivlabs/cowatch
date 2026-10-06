/**
 * Thin typed wrapper over the Telegram Mini Apps SDK (telegram-web-app.js).
 *
 * The SDK is loaded on demand by the /tg routes only, so the regular site does
 * not ship it. Inside Telegram the script reads the launch parameters from the
 * URL hash, so it has to run before anything navigates; TelegramProvider waits
 * for it before rendering routes. If `window.Telegram.WebApp` already exists
 * (the SDK was injected earlier, or a test harness provides a stand-in) the
 * loader reuses it.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(handler: () => void): void;
  offClick(handler: () => void): void;
}

export interface TelegramMainButton extends TelegramButton {
  text: string;
  isActive: boolean;
  setText(text: string): TelegramMainButton;
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }): TelegramMainButton;
  enable(): TelegramMainButton;
  disable(): TelegramMainButton;
  showProgress(leaveActive?: boolean): TelegramMainButton;
  hideProgress(): TelegramMainButton;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

export interface TelegramCloudStorage {
  getItem(key: string, callback: (error: Error | null, value?: string) => void): void;
  setItem(key: string, value: string, callback?: (error: Error | null, stored?: boolean) => void): void;
  removeItem(key: string, callback?: (error: Error | null, removed?: boolean) => void): void;
}

export interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  BackButton: TelegramButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  CloudStorage: TelegramCloudStorage;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  enableVerticalSwipes?(): void;
  disableVerticalSwipes?(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  showAlert(message: string, callback?: () => void): void;
  onEvent(event: string, handler: (...args: unknown[]) => void): void;
  offEvent(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js?59';

/** Night Cinema ink, so the Telegram chrome matches the app background. */
export const TELEGRAM_CHROME_COLOR = '#070a1c';

let loading: Promise<TelegramWebApp | null> | null = null;

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function loadTelegramWebApp(): Promise<TelegramWebApp | null> {
  const existing = getTelegramWebApp();
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;

  loading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve(getTelegramWebApp());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loading;
}

/** Outside Telegram the SDK still exists, but initData is empty. */
export function isInsideTelegram(webApp: TelegramWebApp | null): webApp is TelegramWebApp {
  return Boolean(webApp && webApp.initData);
}

/** Some SDK calls throw on old clients; the app works the same without them. */
export function tryWebApp(action: () => void) {
  try {
    action();
  } catch {
    // Unsupported on this Telegram version: nothing to do.
  }
}

export function supports(webApp: TelegramWebApp | null, version: string): boolean {
  try {
    return Boolean(webApp?.isVersionAtLeast(version));
  } catch {
    return false;
  }
}

/** Opens Telegram's own "send to" sheet with a link and a short text. */
export function shareViaTelegram(webApp: TelegramWebApp | null, url: string, text: string) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (webApp) {
    tryWebApp(() => webApp.openTelegramLink(shareUrl));
  } else {
    window.open(shareUrl, '_blank', 'noopener');
  }
}

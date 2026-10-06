import { useCallback, useEffect, useState } from 'react';
import { supports, type TelegramWebApp } from '@/lib/telegram';

/**
 * Rooms the viewer opened recently, kept in Telegram CloudStorage so they follow
 * the account across devices. Older clients (before Bot API 6.9) fall back to
 * localStorage of the current device.
 */
export interface RecentRoom {
  code: string;
  title: string;
  visitedAt: string;
}

const KEY = 'recent_rooms';
const LOCAL_KEY = 'cowatch_tg_recent_rooms';
const LIMIT = 5;

function parse(raw: string | undefined | null): RecentRoom[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is RecentRoom =>
        typeof item === 'object' && item !== null && typeof (item as RecentRoom).code === 'string',
    );
  } catch {
    return [];
  }
}

function hasCloudStorage(webApp: TelegramWebApp | null): webApp is TelegramWebApp {
  return supports(webApp, '6.9') && Boolean(webApp?.CloudStorage);
}

export function readRecentRooms(webApp: TelegramWebApp | null): Promise<RecentRoom[]> {
  if (hasCloudStorage(webApp)) {
    return new Promise((resolve) => {
      try {
        webApp.CloudStorage.getItem(KEY, (err, value) => resolve(err ? [] : parse(value)));
      } catch {
        resolve([]);
      }
    });
  }
  try {
    return Promise.resolve(parse(localStorage.getItem(LOCAL_KEY)));
  } catch {
    return Promise.resolve([]);
  }
}

function write(webApp: TelegramWebApp | null, rooms: RecentRoom[]): Promise<void> {
  const raw = JSON.stringify(rooms);
  if (hasCloudStorage(webApp)) {
    return new Promise((resolve) => {
      try {
        webApp.CloudStorage.setItem(KEY, raw, () => resolve());
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.setItem(LOCAL_KEY, raw);
  } catch {
    // Storage blocked: the list is a convenience, nothing depends on it.
  }
  return Promise.resolve();
}

export async function rememberRoom(webApp: TelegramWebApp | null, room: { code: string; title: string }) {
  const current = await readRecentRooms(webApp);
  const next: RecentRoom[] = [
    { code: room.code, title: room.title, visitedAt: new Date().toISOString() },
    ...current.filter((item) => item.code !== room.code),
  ].slice(0, LIMIT);
  await write(webApp, next);
}

export async function forgetRoom(webApp: TelegramWebApp | null, code: string) {
  const current = await readRecentRooms(webApp);
  await write(
    webApp,
    current.filter((item) => item.code !== code),
  );
}

export function useRecentRooms(webApp: TelegramWebApp | null) {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    let cancelled = false;
    readRecentRooms(webApp).then((list) => {
      if (cancelled) return;
      setRooms(list);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [webApp]);

  useEffect(() => refresh(), [refresh]);

  const forget = useCallback(
    async (code: string) => {
      await forgetRoom(webApp, code);
      setRooms((list) => list.filter((item) => item.code !== code));
    },
    [webApp],
  );

  return { rooms, loaded, forget };
}

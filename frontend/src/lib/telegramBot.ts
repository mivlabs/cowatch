/**
 * Which bot the Mini App belongs to: @cowatchfun_bot in production.
 * VITE_TELEGRAM_BOT_USERNAME overrides it (a test bot in frontend/.env.local, say);
 * with no bot at all invitations fall back to plain site links.
 */
const DEFAULT_BOT_USERNAME = 'cowatchfun_bot';

export const TELEGRAM_BOT_USERNAME =
  ((import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) ?? '').trim().replace(/^@/, '') ||
  DEFAULT_BOT_USERNAME;

/** t.me/<bot>?startapp=<code>: opens the bot's main Mini App straight in the room. */
export function miniAppLink(startParam?: string): string | null {
  if (!TELEGRAM_BOT_USERNAME) return null;
  const base = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  return startParam ? `${base}?startapp=${encodeURIComponent(startParam)}` : base;
}

/** Best link to invite someone into a room: Mini App deep link, else the site. */
export function roomInviteLink(code: string): string {
  return miniAppLink(code) ?? `${window.location.origin}/room/${code}`;
}

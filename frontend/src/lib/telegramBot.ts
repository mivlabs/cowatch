/**
 * Which bot the Mini App belongs to. Set VITE_TELEGRAM_BOT_USERNAME on Vercel
 * (and in frontend/.env.local for development) once the bot exists; without it
 * invitations fall back to plain site links, which still open the room on the web.
 */
export const TELEGRAM_BOT_USERNAME = ((import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) ?? '')
  .trim()
  .replace(/^@/, '');

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

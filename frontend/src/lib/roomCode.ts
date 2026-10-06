/**
 * Room codes are six characters from the rooms service alphabet (no O/0, I/1).
 * People paste them in every shape: lowercase, with a hash, as a site link or a
 * Mini App deep link. Mirrors links.py in services/telegram_bot.
 */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /(?<![A-Z0-9])([A-HJ-NP-Z2-9]{6})(?![A-Z0-9])/g;

export function normalizeRoomCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim().toUpperCase();
  const bare = text.replace(/^#+/, '').trim();
  if (bare.length === 6 && [...bare].every((ch) => ROOM_CODE_ALPHABET.includes(ch))) return bare;
  const matches = [...text.matchAll(CODE_PATTERN)].map((m) => m[1]);
  return matches.length ? matches[matches.length - 1] : null;
}

/** startapp payload from a deep link: "ABC234" or "room_ABC234". */
export function parseStartParam(param: string | null | undefined): string | null {
  if (!param) return null;
  const value = param.trim().replace(/^room[_-]?/i, '');
  return normalizeRoomCode(value);
}

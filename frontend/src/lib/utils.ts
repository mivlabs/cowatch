import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Drops the emoji presentation selector (U+FE0F), so a monochrome emoji font
 * can draw the glyph instead of the system colour emoji. Use for display only.
 */
export function textEmoji(value: string) {
  return value.replace(/️/g, '');
}

// Noto Emoji draws the plain heart with hatching, which shimmers at small sizes;
// the outline heart reads cleaner, so reactions show that one instead.
const REACTION_GLYPHS: Record<string, string> = { '❤': '\u{1F90D}' };

/** How a reaction is drawn on screen. The value sent to the room stays as is. */
export function reactionGlyph(emoji: string) {
  const text = textEmoji(emoji);
  return REACTION_GLYPHS[text] ?? text;
}

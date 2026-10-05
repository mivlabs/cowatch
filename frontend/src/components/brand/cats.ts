import catSit from '@/assets/cats/cat-sit.svg';
import catSleep from '@/assets/cats/cat-sleep.svg';
import catStretch from '@/assets/cats/cat-stretch.svg';
import catWave from '@/assets/cats/cat-wave.svg';

/*
 * Placeholder mascot until the hand-drawn cats are ready. Based on Freepik's
 * "flat halloween black cats" set, recoloured to the night palette with a cream
 * sticker outline. The free licence needs the "Designed by Freepik" credit in
 * the footer, and the cats can't be used in the logo or favicon.
 *
 * Each pose has one job:
 *   sleep   - empty room, waiting for friends
 *   wave    - greeting, someone joined
 *   stretch - loading
 *   sit     - 404, nothing found, the cat on the moon
 */
export const CATS = {
  sit: { src: catSit, ratio: 201.7 / 183.7 },
  sleep: { src: catSleep, ratio: 161.9 / 234.8 },
  stretch: { src: catStretch, ratio: 210 / 252.7 },
  wave: { src: catWave, ratio: 226.8 / 204.1 },
} as const;

export type CatPose = keyof typeof CATS;

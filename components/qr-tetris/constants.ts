import type { Theme } from './types';

export const CELL_SIZE_MAX = 18;
export const CELL_SIZE_MIN = 9;
export const FALL_MS = 420;
export const SKY_ROWS = 10;
export const THEME_KEY = 'qr-tetris-theme';
export const BLOCK_SIZE = 4;

// A QR finder pattern (7×7 modules): the logo of the app, drawn in the title and the favicon.
export const FINDER_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

export const DEFAULT_THEME: Theme = { mode: 'dark', accent: '#22c55e' };

export const ACCENTS = [
  { label: 'Vert', value: '#22c55e' },
  { label: 'Bleu', value: '#3b82f6' },
  { label: 'Violet', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Rose', value: '#ec4899' },
  { label: 'Cyan', value: '#06b6d4' },
];

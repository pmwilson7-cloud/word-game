import type { PremiumType } from '../types/index.ts';

export const BOARD_SIZE = 15;
export const CENTER = 7;
export const RACK_SIZE = 7;

// Compact board layout: each row is a string of 15 chars
// . = none, d = double letter, t = triple letter, D = double word, T = triple word, * = star
const LAYOUT_ROWS = [
  'T..d...T...d..T',
  '.D...t...t...D.',
  '..D...d.d...D..',
  'd..D...d...D..d',
  '....D.....D....',
  '.t...t...t...t.',
  '..d...d.d...d..',
  'T..d...*...d..T',
  '..d...d.d...d..',
  '.t...t...t...t.',
  '....D.....D....',
  'd..D...d...D..d',
  '..D...d.d...D..',
  '.D...t...t...D.',
  'T..d...T...d..T',
];

const CHAR_TO_PREMIUM: Record<string, PremiumType> = {
  '.': 'none',
  'd': 'dl',
  't': 'tl',
  'D': 'dw',
  'T': 'tw',
  '*': 'star',
};

export const PREMIUM_LAYOUT: PremiumType[][] = LAYOUT_ROWS.map(row =>
  [...row].map(ch => CHAR_TO_PREMIUM[ch] ?? 'none')
);

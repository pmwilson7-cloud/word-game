export interface TileDistribution {
  letter: string;
  count: number;
  points: number;
}

export const TILE_DISTRIBUTION: TileDistribution[] = [
  { letter: 'A', count: 9,  points: 1 },
  { letter: 'B', count: 2,  points: 3 },
  { letter: 'C', count: 2,  points: 3 },
  { letter: 'D', count: 4,  points: 2 },
  { letter: 'E', count: 12, points: 1 },
  { letter: 'F', count: 2,  points: 4 },
  { letter: 'G', count: 3,  points: 2 },
  { letter: 'H', count: 2,  points: 4 },
  { letter: 'I', count: 9,  points: 1 },
  { letter: 'J', count: 1,  points: 8 },
  { letter: 'K', count: 1,  points: 5 },
  { letter: 'L', count: 4,  points: 1 },
  { letter: 'M', count: 2,  points: 3 },
  { letter: 'N', count: 6,  points: 1 },
  { letter: 'O', count: 8,  points: 1 },
  { letter: 'P', count: 2,  points: 3 },
  { letter: 'Q', count: 1,  points: 10 },
  { letter: 'R', count: 6,  points: 1 },
  { letter: 'S', count: 4,  points: 1 },
  { letter: 'T', count: 6,  points: 1 },
  { letter: 'U', count: 4,  points: 1 },
  { letter: 'V', count: 2,  points: 4 },
  { letter: 'W', count: 2,  points: 4 },
  { letter: 'X', count: 1,  points: 8 },
  { letter: 'Y', count: 2,  points: 4 },
  { letter: 'Z', count: 1,  points: 10 },
  { letter: '',  count: 2,  points: 0 },  // blanks
];

export const BINGO_BONUS = 50;
export const TOTAL_TILES = TILE_DISTRIBUTION.reduce((sum, t) => sum + t.count, 0); // 100

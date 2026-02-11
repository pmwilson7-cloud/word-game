import type { Tile } from '../types/index.ts';
import { TILE_DISTRIBUTION } from '../constants/tiles.ts';

let nextId = 0;

function generateId(): string {
  return `tile-${nextId++}`;
}

export function resetIdCounter(): void {
  nextId = 0;
}

export function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  for (const { letter, count, points } of TILE_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: generateId(),
        letter,
        points,
        isBlank: letter === '',
      });
    }
  }
  return shuffle(tiles);
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
}

export function returnTiles(bag: Tile[], tiles: Tile[]): Tile[] {
  return shuffle([...bag, ...tiles]);
}

import type { Board, Position, FoundWord, PlacedTile } from '../types/index.ts';
import { getCell } from './board.ts';
import { BINGO_BONUS } from '../constants/tiles.ts';
import { RACK_SIZE } from '../constants/board.ts';

// Get the letter to use for scoring (handles blank tiles)
function tilePoints(board: Board, pos: Position): number {
  const tile = getCell(board, pos).tile;
  if (!tile) return 0;
  return tile.points; // blank tiles have 0 points
}

function tileLetter(board: Board, pos: Position): string {
  const tile = getCell(board, pos).tile;
  if (!tile) return '';
  if (tile.isBlank) return tile.designatedLetter ?? '';
  return tile.letter;
}

// Score a single word given its positions on the board
// newPositions = positions of tiles placed THIS turn (premiums only apply to new tiles)
export function scoreWord(board: Board, positions: Position[], newPositions: Set<string>): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const pos of positions) {
    const key = `${pos.row},${pos.col}`;
    const isNew = newPositions.has(key);
    let letterScore = tilePoints(board, pos);
    const premium = getCell(board, pos).premium;

    if (isNew) {
      switch (premium) {
        case 'dl': letterScore *= 2; break;
        case 'tl': letterScore *= 3; break;
        case 'dw': case 'star': wordMultiplier *= 2; break;
        case 'tw': wordMultiplier *= 3; break;
      }
    }

    wordScore += letterScore;
  }

  return wordScore * wordMultiplier;
}

// Find the full extent of a word starting from a position in a direction
export function getWordPositions(
  board: Board,
  startPos: Position,
  direction: 'horizontal' | 'vertical'
): Position[] {
  const positions: Position[] = [];
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  // Walk backward to find the start of the word
  let r = startPos.row;
  let c = startPos.col;
  while (r - dr >= 0 && c - dc >= 0 && getCell(board, { row: r - dr, col: c - dc }).tile) {
    r -= dr;
    c -= dc;
  }

  // Walk forward collecting all positions
  while (r >= 0 && r < 15 && c >= 0 && c < 15 && getCell(board, { row: r, col: c }).tile) {
    positions.push({ row: r, col: c });
    r += dr;
    c += dc;
  }

  return positions;
}

// Get the string representation of a word from positions
export function getWordString(board: Board, positions: Position[]): string {
  return positions.map(pos => tileLetter(board, pos)).join('');
}

// Calculate total score for a move
export function calculateMoveScore(
  board: Board,
  words: { positions: Position[] }[],
  placedTiles: PlacedTile[]
): { wordsFormed: FoundWord[]; totalScore: number } {
  const newPositions = new Set(placedTiles.map(pt => `${pt.position.row},${pt.position.col}`));

  const wordsFormed: FoundWord[] = [];
  let totalScore = 0;

  for (const { positions } of words) {
    const word = getWordString(board, positions);
    const score = scoreWord(board, positions, newPositions);
    wordsFormed.push({ word, positions, score });
    totalScore += score;
  }

  // Bingo bonus: all 7 tiles placed
  if (placedTiles.length === RACK_SIZE) {
    totalScore += BINGO_BONUS;
  }

  return { wordsFormed, totalScore };
}

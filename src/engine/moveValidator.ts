import type { Board, PlacedTile, Position } from '../types/index.ts';
import { getCell, isInBounds, getBoardTileCount } from './board.ts';
import { CENTER, BOARD_SIZE } from '../constants/board.ts';
import { getWordPositions, getWordString } from './scoring.ts';
import { isValidWord } from './dictionary.ts';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  words?: { positions: Position[]; word: string }[];
}

// Check that all placements are in a single row or single column
type LinearityResult =
  | { valid: true; direction: 'horizontal' | 'vertical' | 'single' }
  | { valid: false; direction?: undefined; error: string };

function checkLinearity(placements: PlacedTile[]): LinearityResult {
  if (placements.length === 1) return { valid: true, direction: 'single' };

  const rows = new Set(placements.map(p => p.position.row));
  const cols = new Set(placements.map(p => p.position.col));

  if (rows.size === 1) return { valid: true, direction: 'horizontal' };
  if (cols.size === 1) return { valid: true, direction: 'vertical' };

  return { valid: false, error: 'Tiles must be placed in a single row or column' };
}

// Check that tiles form a contiguous line (no gaps, accounting for existing tiles)
function checkContiguity(board: Board, placements: PlacedTile[], direction: 'horizontal' | 'vertical' | 'single'): boolean {
  if (placements.length <= 1) return true;
  if (direction === 'single') return true;

  const sorted = [...placements].sort((a, b) =>
    direction === 'horizontal'
      ? a.position.col - b.position.col
      : a.position.row - b.position.row
  );

  const first = sorted[0].position;
  const last = sorted[sorted.length - 1].position;

  if (direction === 'horizontal') {
    for (let c = first.col; c <= last.col; c++) {
      const cell = getCell(board, { row: first.row, col: c });
      const isPlaced = placements.some(p => p.position.row === first.row && p.position.col === c);
      if (!cell.tile && !isPlaced) return false;
    }
  } else {
    for (let r = first.row; r <= last.row; r++) {
      const cell = getCell(board, { row: r, col: first.col });
      const isPlaced = placements.some(p => p.position.row === r && p.position.col === first.col);
      if (!cell.tile && !isPlaced) return false;
    }
  }

  return true;
}

// Check that at least one new tile connects to existing tiles (or covers center on first move)
function checkConnectivity(board: Board, placements: PlacedTile[], isFirstMove: boolean): boolean {
  if (isFirstMove) {
    return placements.some(p => p.position.row === CENTER && p.position.col === CENTER);
  }

  const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const { position } of placements) {
    for (const [dr, dc] of adjacentOffsets) {
      const adjPos = { row: position.row + dr, col: position.col + dc };
      if (isInBounds(adjPos)) {
        const adjCell = getCell(board, adjPos);
        // Adjacent to an existing tile (not one we just placed)
        if (adjCell.tile && !placements.some(p => p.position.row === adjPos.row && p.position.col === adjPos.col)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Find all words formed by the placement
function findFormedWords(
  board: Board,
  placements: PlacedTile[],
  direction: 'horizontal' | 'vertical' | 'single'
): { positions: Position[]; word: string }[] {
  const words: { positions: Position[]; word: string }[] = [];

  // Primary word (along the placement direction)
  const primaryDir = direction === 'vertical' ? 'vertical' : 'horizontal';
  const crossDir = direction === 'vertical' ? 'horizontal' : 'vertical';

  if (direction !== 'single' || placements.length === 1) {
    // Get the main word
    const mainWordPositions = getWordPositions(board, placements[0].position, primaryDir);
    if (mainWordPositions.length > 1) {
      const word = getWordString(board, mainWordPositions);
      words.push({ positions: mainWordPositions, word });
    }
  }

  // Cross words (perpendicular to placement direction)
  for (const { position } of placements) {
    const crossPositions = getWordPositions(board, position, crossDir);
    if (crossPositions.length > 1) {
      const word = getWordString(board, crossPositions);
      words.push({ positions: crossPositions, word });
    }
  }

  // For single tile, also check the other direction for main word
  if (direction === 'single') {
    const otherDir = 'vertical';
    const otherPositions = getWordPositions(board, placements[0].position, otherDir);
    if (otherPositions.length > 1) {
      const word = getWordString(board, otherPositions);
      // Avoid duplicate if already added
      const isDuplicate = words.some(w =>
        w.positions.length === otherPositions.length &&
        w.positions[0].row === otherPositions[0].row &&
        w.positions[0].col === otherPositions[0].col
      );
      if (!isDuplicate) {
        words.push({ positions: otherPositions, word });
      }
    }
  }

  return words;
}

// Validate a complete move
export function validateMove(boardBeforePlacement: Board, boardAfterPlacement: Board, placements: PlacedTile[]): ValidationResult {
  if (placements.length === 0) {
    return { valid: false, error: 'No tiles placed' };
  }

  // Check all positions are empty on the pre-placement board
  for (const { position } of placements) {
    if (!isInBounds(position)) {
      return { valid: false, error: 'Tile placed out of bounds' };
    }
    const cell = getCell(boardBeforePlacement, position);
    if (cell.tile) {
      return { valid: false, error: 'Cannot place tile on an occupied cell' };
    }
  }

  // Linearity check
  const linearity = checkLinearity(placements);
  if (!linearity.valid) {
    return { valid: false, error: linearity.error };
  }

  // Contiguity check (using the board AFTER placement to check for gaps filled by existing tiles)
  if (!checkContiguity(boardAfterPlacement, placements, linearity.direction)) {
    return { valid: false, error: 'Tiles must form a contiguous line (no gaps)' };
  }

  // Connectivity check
  const existingTileCount = getBoardTileCount(boardBeforePlacement);
  const isFirstMove = existingTileCount === 0;
  if (!checkConnectivity(boardBeforePlacement, placements, isFirstMove)) {
    if (isFirstMove) {
      return { valid: false, error: 'First word must cover the center square' };
    }
    return { valid: false, error: 'New tiles must connect to existing tiles' };
  }

  // Find all formed words
  const words = findFormedWords(boardAfterPlacement, placements, linearity.direction);

  if (words.length === 0) {
    return { valid: false, error: 'No words formed' };
  }

  // Validate all words against dictionary
  for (const { word } of words) {
    if (!isValidWord(word)) {
      return { valid: false, error: `"${word}" is not a valid word` };
    }
  }

  return { valid: true, words };
}

// Quick check for valid placement positions (for UI hints)
export function canPlaceAt(board: Board, pos: Position): boolean {
  if (!isInBounds(pos)) return false;
  return getCell(board, pos).tile === null;
}

export function hasAdjacentTile(board: Board, pos: Position): boolean {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of offsets) {
    const adj: Position = { row: pos.row + dr, col: pos.col + dc };
    if (adj.row >= 0 && adj.row < BOARD_SIZE && adj.col >= 0 && adj.col < BOARD_SIZE) {
      if (getCell(board, adj).tile !== null) return true;
    }
  }
  return false;
}

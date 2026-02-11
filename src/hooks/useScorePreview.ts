import { useMemo } from 'react';
import type { Board, PlacedTile, FoundWord } from '../types/index.ts';
import { removeTiles } from '../engine/board.ts';
import { validateMove } from '../engine/moveValidator.ts';
import { calculateMoveScore } from '../engine/scoring.ts';

export interface ScorePreview {
  valid: boolean;
  totalScore: number;
  words: FoundWord[];
}

export function useScorePreview(
  board: Board,
  pendingPlacements: PlacedTile[]
): ScorePreview | null {
  return useMemo(() => {
    if (pendingPlacements.length === 0) return null;

    // Check for undesignated blanks — can't preview score yet
    const hasUndesignatedBlank = pendingPlacements.some(
      p => p.tile.isBlank && !p.tile.designatedLetter
    );
    if (hasUndesignatedBlank) return null;

    const positions = pendingPlacements.map(p => p.position);
    const { board: boardBefore } = removeTiles(board, positions);

    const result = validateMove(boardBefore, board, pendingPlacements);

    if (!result.valid) {
      return { valid: false, totalScore: 0, words: [] };
    }

    const { wordsFormed, totalScore } = calculateMoveScore(board, result.words!, pendingPlacements);

    return { valid: true, totalScore, words: wordsFormed };
  }, [board, pendingPlacements]);
}

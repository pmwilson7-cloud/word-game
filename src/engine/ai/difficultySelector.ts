import type { AIDifficulty } from '../../types/index.ts';
import type { AIMove } from './moveFinder.ts';

export function selectMove(moves: AIMove[], difficulty: AIDifficulty): AIMove | null {
  if (moves.length === 0) return null;

  const sorted = [...moves].sort((a, b) => a.score - b.score);

  switch (difficulty) {
    case 'easy': {
      // Filter to moves using <= 4 tiles (no bingos), pick from bottom 40% by score
      const simple = sorted.filter(m => m.placements.length <= 4);
      const pool = simple.length > 0 ? simple : sorted;
      const cutoff = Math.max(1, Math.ceil(pool.length * 0.4));
      const candidates = pool.slice(0, cutoff);
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    case 'medium': {
      // Weighted random from top 50% (higher scores = higher probability)
      const startIdx = Math.floor(sorted.length / 2);
      const candidates = sorted.slice(startIdx);
      // Weight by score
      const totalScore = candidates.reduce((sum, m) => sum + m.score, 0);
      if (totalScore === 0) return candidates[Math.floor(Math.random() * candidates.length)];
      let rand = Math.random() * totalScore;
      for (const move of candidates) {
        rand -= move.score;
        if (rand <= 0) return move;
      }
      return candidates[candidates.length - 1];
    }
    case 'hard': {
      // Always pick highest scoring move
      return sorted[sorted.length - 1];
    }
  }

  // Safety net: if we somehow fall through, always play a move when one exists
  return sorted[Math.floor(Math.random() * sorted.length)];
}

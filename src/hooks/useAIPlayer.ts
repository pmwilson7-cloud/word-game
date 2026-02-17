import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { getDictionary } from '../engine/dictionary.ts';
import { findAllMoves } from '../engine/ai/moveFinder.ts';
import { selectMove } from '../engine/ai/difficultySelector.ts';
import type { AIDifficulty } from '../types/index.ts';

const THINKING_DELAYS: Record<AIDifficulty, [number, number]> = {
  easy: [800, 1500],
  medium: [1000, 2000],
  hard: [1500, 2500],
};

function randomDelay(range: [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

export function useAIPlayer() {
  const runningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Subscribe to store changes outside of React's render cycle
    // to avoid dependency-array pitfalls
    function check() {
      const { phase, currentPlayerIndex, players } = useGameStore.getState();
      const { showTurnTransition } = useUiStore.getState();

      if (phase !== 'playing') return;
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer?.isAI) return;
      if (showTurnTransition) return;
      if (runningRef.current) return;

      runningRef.current = true;
      useUiStore.getState().setAIThinking(true);

      const difficulty = currentPlayer.aiDifficulty ?? 'medium';
      const delay = randomDelay(THINKING_DELAYS[difficulty]);

      timeoutRef.current = setTimeout(() => {
        const dictionary = getDictionary();
        if (!dictionary) {
          useGameStore.getState().passTurn();
          useUiStore.getState().setAIThinking(false);
          runningRef.current = false;
          return;
        }

        const state = useGameStore.getState();
        const player = state.players[state.currentPlayerIndex];
        if (!player?.isAI) {
          useUiStore.getState().setAIThinking(false);
          runningRef.current = false;
          return;
        }

        const allMoves = findAllMoves(state.board, player.rack, dictionary);
        const chosen = selectMove(allMoves, difficulty);

        if (chosen) {
          useGameStore.getState().commitAIMove(chosen.placements);
        } else {
          if (state.tileBag.length >= 7) {
            useGameStore.getState().exchangeTiles(player.rack.slice(0, Math.min(player.rack.length, 7)));
          } else {
            useGameStore.getState().passTurn();
          }
        }

        useUiStore.getState().setAIThinking(false);
        runningRef.current = false;
      }, delay);
    }

    // Check immediately
    check();

    // Subscribe to both stores so we react to turn changes, game start, etc.
    const unsubGame = useGameStore.subscribe(check);
    const unsubUi = useUiStore.subscribe(check);

    return () => {
      unsubGame();
      unsubUi();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      runningRef.current = false;
      useUiStore.getState().setAIThinking(false);
    };
  }, []); // mount once, subscribe to stores directly
}

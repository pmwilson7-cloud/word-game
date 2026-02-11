import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useTimerStore } from '../store/timerStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import type { TimerConfig, Tile } from '../types/index.ts';

export function useGame() {
  const game = useGameStore();
  const timer = useTimerStore();
  const ui = useUiStore();
  const prevPlayerIndex = useRef(game.currentPlayerIndex);
  const timerInitialized = useRef(false);

  // Stable action refs that don't change between renders
  const timerActions = useRef(timer);
  timerActions.current = timer;
  const gameActions = useRef(game);
  gameActions.current = game;

  // Re-initialize timer when rehydrated from localStorage with an active game
  useEffect(() => {
    if (game.phase === 'playing' && !timerInitialized.current && game.timerConfig.mode !== 'none') {
      timerActions.current.initTimers(
        game.timerConfig.mode,
        game.players.length,
        game.timerConfig.perTurnSeconds,
        game.timerConfig.totalSeconds
      );
      timerActions.current.startTimer(game.currentPlayerIndex);
      timerInitialized.current = true;
    }
  }, [game.phase, game.timerConfig, game.players.length, game.currentPlayerIndex]);

  // Watch for turn changes
  useEffect(() => {
    if (game.phase !== 'playing') return;

    if (prevPlayerIndex.current !== game.currentPlayerIndex) {
      timerActions.current.onTurnChange(game.currentPlayerIndex);
      prevPlayerIndex.current = game.currentPlayerIndex;
    }
  }, [game.currentPlayerIndex, game.phase]);

  // Watch for timer expiry
  useEffect(() => {
    if (game.phase !== 'playing') return;
    if (timer.mode === 'none') return;

    if (timer.mode === 'per-turn' && timer.turnTimeRemaining <= 0 && timer.isRunning) {
      timerActions.current.pauseTimer();
      gameActions.current.recallTiles();
      gameActions.current.passTurn();
    }

    if (timer.mode === 'chess-clock') {
      const currentTime = timer.playerTimes[game.currentPlayerIndex];
      if (currentTime !== undefined && currentTime <= 0 && timer.isRunning) {
        timerActions.current.pauseTimer();
        gameActions.current.recallTiles();
        gameActions.current.passTurn();
      }
    }
  }, [timer.turnTimeRemaining, timer.playerTimes, timer.isRunning, timer.mode, game.phase, game.currentPlayerIndex]);

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => timerActions.current.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((playerNames: string[], timerConfig: TimerConfig) => {
    timerInitialized.current = true;
    gameActions.current.startGame(playerNames, timerConfig);
    timerActions.current.initTimers(
      timerConfig.mode,
      playerNames.length,
      timerConfig.perTurnSeconds,
      timerConfig.totalSeconds
    );
    if (timerConfig.mode !== 'none') {
      setTimeout(() => timerActions.current.startTimer(0), 50);
    }
  }, []);

  const commitMove = useCallback(() => {
    const blanks = gameActions.current.pendingPlacements.filter(p => p.tile.isBlank && !p.tile.designatedLetter);
    if (blanks.length > 0) {
      ui.openBlankModal(blanks[0].tile.id);
      return;
    }
    gameActions.current.commitMove();
  }, [ui]);

  const exchangeTiles = useCallback((tiles: Tile[]) => {
    gameActions.current.recallTiles();
    gameActions.current.exchangeTiles(tiles);
    ui.closeExchangeModal();
  }, [ui]);

  const pauseGame = useCallback(() => {
    timerActions.current.pauseTimer();
    ui.openPauseOverlay();
  }, [ui]);

  const resumeGame = useCallback(() => {
    ui.closePauseOverlay();
    if (timerActions.current.mode !== 'none') {
      timerActions.current.startTimer(gameActions.current.currentPlayerIndex);
    }
  }, [ui]);

  const exitGame = useCallback(() => {
    timerActions.current.cleanup();
    gameActions.current.resetGame();
    ui.closeExitConfirm();
    ui.closePauseOverlay();
    timerInitialized.current = false;
  }, [ui]);

  const saveAndQuit = useCallback(() => {
    timerActions.current.cleanup();
    gameActions.current.saveAndQuit();
    ui.closeExitConfirm();
    ui.closePauseOverlay();
    timerInitialized.current = false;
  }, [ui]);

  const resumeSavedGame = useCallback(() => {
    gameActions.current.resumeSavedGame();
    const config = gameActions.current.timerConfig;
    if (config.mode !== 'none') {
      timerInitialized.current = true;
      timerActions.current.initTimers(
        config.mode,
        gameActions.current.players.length,
        config.perTurnSeconds,
        config.totalSeconds
      );
      timerActions.current.startTimer(gameActions.current.currentPlayerIndex);
    }
  }, []);

  return {
    ...game,
    timer,
    ui,
    startGame,
    commitMove,
    exchangeTiles,
    pauseGame,
    resumeGame,
    exitGame,
    saveAndQuit,
    resumeSavedGame,
  };
}

import { create } from 'zustand';
import type { TimerMode } from '../types/index.ts';

export interface TimerStore {
  mode: TimerMode;
  // Per-turn mode: seconds remaining this turn
  turnTimeRemaining: number;
  turnTimeTotal: number;
  // Chess clock mode: remaining time per player (indexed by player index)
  playerTimes: number[];
  // State
  activePlayerIndex: number;
  isRunning: boolean;
  intervalId: number | null;

  // Actions
  initTimers: (mode: TimerMode, playerCount: number, perTurnSeconds: number, totalSeconds: number) => void;
  startTimer: (playerIndex: number) => void;
  pauseTimer: () => void;
  tick: () => void;
  resetTurnTimer: () => void;
  onTurnChange: (playerIndex: number) => void;
  cleanup: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  mode: 'none',
  turnTimeRemaining: 0,
  turnTimeTotal: 0,
  playerTimes: [],
  activePlayerIndex: 0,
  isRunning: false,
  intervalId: null,

  initTimers: (mode, playerCount, perTurnSeconds, totalSeconds) => {
    const { cleanup } = get();
    cleanup();

    if (mode === 'per-turn') {
      set({
        mode,
        turnTimeRemaining: perTurnSeconds,
        turnTimeTotal: perTurnSeconds,
        playerTimes: [],
        isRunning: false,
      });
    } else if (mode === 'chess-clock') {
      set({
        mode,
        turnTimeRemaining: 0,
        turnTimeTotal: 0,
        playerTimes: Array(playerCount).fill(totalSeconds),
        isRunning: false,
      });
    } else {
      set({ mode: 'none', isRunning: false });
    }
  },

  startTimer: (playerIndex) => {
    const { mode, intervalId } = get();
    if (mode === 'none') return;

    // Clear existing interval
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }

    const id = window.setInterval(() => {
      get().tick();
    }, 100);

    set({ isRunning: true, activePlayerIndex: playerIndex, intervalId: id });
  },

  pauseTimer: () => {
    const { intervalId } = get();
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
    set({ isRunning: false, intervalId: null });
  },

  tick: () => {
    const { mode, activePlayerIndex } = get();

    if (mode === 'per-turn') {
      set(state => ({
        turnTimeRemaining: Math.max(0, state.turnTimeRemaining - 0.1),
      }));
    } else if (mode === 'chess-clock') {
      set(state => {
        const newTimes = [...state.playerTimes];
        newTimes[activePlayerIndex] = Math.max(0, newTimes[activePlayerIndex] - 0.1);
        return { playerTimes: newTimes };
      });
    }
  },

  resetTurnTimer: () => {
    const { turnTimeTotal } = get();
    set({ turnTimeRemaining: turnTimeTotal });
  },

  onTurnChange: (playerIndex) => {
    const { mode, pauseTimer, startTimer, resetTurnTimer } = get();
    pauseTimer();

    if (mode === 'per-turn') {
      resetTurnTimer();
    }

    if (mode !== 'none') {
      startTimer(playerIndex);
    }

    set({ activePlayerIndex: playerIndex });
  },

  cleanup: () => {
    const { intervalId } = get();
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
    set({ intervalId: null, isRunning: false });
  },
}));

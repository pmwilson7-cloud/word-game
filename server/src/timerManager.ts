import type { TimerConfig, TimerMode } from '../../src/types/index.ts';
import type { ClientTimerState } from '../../src/types/online.ts';

export interface GameTimer {
  mode: TimerMode;
  turnTimeRemaining: number;
  turnTimeTotal: number;
  playerTimes: number[];
  activePlayerIndex: number;
  intervalId: ReturnType<typeof setInterval> | null;
  onTick: (state: ClientTimerState) => void;
  onExpire: () => void;
}

const timers = new Map<string, GameTimer>();

export function createTimer(
  roomCode: string,
  config: TimerConfig,
  playerCount: number,
  onTick: (state: ClientTimerState) => void,
  onExpire: () => void
): void {
  cleanupTimer(roomCode);

  const timer: GameTimer = {
    mode: config.mode,
    turnTimeRemaining: config.mode === 'per-turn' ? config.perTurnSeconds : 0,
    turnTimeTotal: config.perTurnSeconds,
    playerTimes: config.mode === 'chess-clock' ? Array(playerCount).fill(config.totalSeconds) : [],
    activePlayerIndex: 0,
    intervalId: null,
    onTick,
    onExpire,
  };

  timers.set(roomCode, timer);
}

export function startTimer(roomCode: string, playerIndex: number): void {
  const timer = timers.get(roomCode);
  if (!timer || timer.mode === 'none') return;

  if (timer.intervalId !== null) {
    clearInterval(timer.intervalId);
  }

  timer.activePlayerIndex = playerIndex;

  timer.intervalId = setInterval(() => {
    if (timer.mode === 'per-turn') {
      timer.turnTimeRemaining = Math.max(0, timer.turnTimeRemaining - 1);
      timer.onTick(getTimerState(roomCode)!);
      if (timer.turnTimeRemaining <= 0) {
        pauseTimer(roomCode);
        timer.onExpire();
      }
    } else if (timer.mode === 'chess-clock') {
      timer.playerTimes[timer.activePlayerIndex] = Math.max(0, timer.playerTimes[timer.activePlayerIndex] - 1);
      timer.onTick(getTimerState(roomCode)!);
      if (timer.playerTimes[timer.activePlayerIndex] <= 0) {
        pauseTimer(roomCode);
        timer.onExpire();
      }
    }
  }, 1000);
}

export function pauseTimer(roomCode: string): void {
  const timer = timers.get(roomCode);
  if (!timer) return;
  if (timer.intervalId !== null) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

export function onTurnChange(roomCode: string, playerIndex: number): void {
  const timer = timers.get(roomCode);
  if (!timer || timer.mode === 'none') return;

  pauseTimer(roomCode);

  if (timer.mode === 'per-turn') {
    timer.turnTimeRemaining = timer.turnTimeTotal;
  }

  startTimer(roomCode, playerIndex);
}

export function getTimerState(roomCode: string): ClientTimerState | null {
  const timer = timers.get(roomCode);
  if (!timer) return null;

  return {
    mode: timer.mode,
    turnTimeRemaining: timer.turnTimeRemaining,
    turnTimeTotal: timer.turnTimeTotal,
    playerTimes: [...timer.playerTimes],
  };
}

export function cleanupTimer(roomCode: string): void {
  const timer = timers.get(roomCode);
  if (timer) {
    if (timer.intervalId !== null) {
      clearInterval(timer.intervalId);
    }
    timers.delete(roomCode);
  }
}

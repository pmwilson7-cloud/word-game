import type { TimerConfig } from '../types/index.ts';

export const TIMER_PRESETS: { label: string; config: TimerConfig }[] = [
  { label: 'No Timer', config: { mode: 'none', perTurnSeconds: 0, totalSeconds: 0 } },
  { label: '1 min/turn', config: { mode: 'per-turn', perTurnSeconds: 60, totalSeconds: 0 } },
  { label: '2 min/turn', config: { mode: 'per-turn', perTurnSeconds: 120, totalSeconds: 0 } },
  { label: '5 min/turn', config: { mode: 'per-turn', perTurnSeconds: 300, totalSeconds: 0 } },
  { label: '10 min clock', config: { mode: 'chess-clock', perTurnSeconds: 0, totalSeconds: 600 } },
  { label: '15 min clock', config: { mode: 'chess-clock', perTurnSeconds: 0, totalSeconds: 900 } },
  { label: '25 min clock', config: { mode: 'chess-clock', perTurnSeconds: 0, totalSeconds: 1500 } },
];

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  mode: 'none',
  perTurnSeconds: 0,
  totalSeconds: 0,
};

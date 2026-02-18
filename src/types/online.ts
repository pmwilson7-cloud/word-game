import type { Board, Tile, Move, TimerConfig, TimerMode, AIDifficulty } from './index.ts';

// Public player info (visible to all clients)
export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  rackCount: number;
  isEliminated: boolean;
  consecutivePasses: number;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

// Room states
export type RoomStatus = 'waiting' | 'playing' | 'ended';

export interface RoomState {
  code: string;
  status: RoomStatus;
  players: RoomPlayer[];
  hostId: string;
  timerConfig: TimerConfig;
  maxPlayers: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  connected: boolean;
}

// What the server sends to each client (sanitized: only your rack)
export interface ClientGameState {
  board: Board;
  players: PublicPlayer[];
  currentPlayerIndex: number;
  myPlayerIndex: number;
  myRack: Tile[];
  tileBagCount: number;
  moveHistory: Move[];
  consecutiveScorelessTurns: number;
  timerConfig: TimerConfig;
  timerState: ClientTimerState;
  phase: 'playing' | 'ended';
  endReason: string | null;
}

export interface ClientTimerState {
  mode: TimerMode;
  turnTimeRemaining: number;
  turnTimeTotal: number;
  playerTimes: number[];
}

// Online player config for room setup
export interface OnlinePlayerConfig {
  name: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

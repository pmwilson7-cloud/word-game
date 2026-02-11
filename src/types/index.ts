export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  letter: string;
  points: number;
  isBlank: boolean;
  designatedLetter?: string;
}

export type PremiumType = 'none' | 'dl' | 'tl' | 'dw' | 'tw' | 'star';

export interface BoardCell {
  position: Position;
  tile: Tile | null;
  premium: PremiumType;
}

export type Board = BoardCell[][];

export interface Player {
  id: string;
  name: string;
  score: number;
  rack: Tile[];
  isEliminated: boolean;
  consecutivePasses: number;
}

export interface PlacedTile {
  tile: Tile;
  position: Position;
}

export type TimerMode = 'per-turn' | 'chess-clock' | 'none';

export interface TimerConfig {
  mode: TimerMode;
  perTurnSeconds: number;
  totalSeconds: number;
}

export interface FoundWord {
  word: string;
  positions: Position[];
  score: number;
}

export interface Move {
  playerId: string;
  type: 'play' | 'pass' | 'exchange';
  tilesPlaced?: PlacedTile[];
  wordsFormed?: FoundWord[];
  score: number;
  timestamp: number;
}

export type GamePhase = 'setup' | 'playing' | 'ended';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: Board;
  tileBag: Tile[];
  moveHistory: Move[];
  consecutiveScorelessTurns: number;
  timerConfig: TimerConfig;
}

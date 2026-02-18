import { create } from 'zustand';
import type { Board, Tile, PlacedTile, Move, TimerConfig, TimerMode } from '../types/index.ts';
import type { PublicPlayer, RoomState, ClientTimerState } from '../types/online.ts';
import { placeTiles, removeTiles } from '../engine/board.ts';
import { createBoard } from '../engine/board.ts';
import { shuffle } from '../engine/tileBag.ts';

export type OnlinePhase = 'idle' | 'lobby' | 'waiting' | 'playing' | 'ended';

export interface OnlineStore {
  // Connection
  phase: OnlinePhase;
  roomCode: string | null;
  playerId: string | null;
  error: string | null;

  // Room state (from server)
  roomState: RoomState | null;

  // Game state (from server)
  board: Board;
  players: PublicPlayer[];
  currentPlayerIndex: number;
  myPlayerIndex: number;
  myRack: Tile[];
  tileBagCount: number;
  moveHistory: Move[];
  timerConfig: TimerConfig;
  timerState: ClientTimerState;
  endReason: string | null;

  // Local-only state (pending placements, not sent until commit)
  pendingPlacements: PlacedTile[];
  lastError: string | null;

  // Disconnection
  disconnectedPlayer: string | null;

  // Actions
  setPhase: (phase: OnlinePhase) => void;
  setRoom: (code: string, playerId: string) => void;
  setRoomState: (state: RoomState) => void;
  applyGameState: (state: {
    board: Board;
    players: PublicPlayer[];
    currentPlayerIndex: number;
    myPlayerIndex: number;
    myRack: Tile[];
    tileBagCount: number;
    moveHistory: Move[];
    timerConfig: TimerConfig;
    timerState: ClientTimerState;
    phase: 'playing' | 'ended';
    endReason: string | null;
  }) => void;
  updateTimer: (timer: ClientTimerState) => void;
  setError: (error: string | null) => void;
  setLastError: (error: string | null) => void;
  setDisconnectedPlayer: (name: string | null) => void;

  // Local tile manipulation
  placeTileOnBoard: (tile: Tile, row: number, col: number) => void;
  removeTileFromBoard: (row: number, col: number) => void;
  moveTileOnBoard: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  recallTiles: () => void;
  shuffleRack: () => void;
  setBlankLetter: (tileId: string, letter: string) => void;

  // Reset
  reset: () => void;
}

const defaultTimerState: ClientTimerState = {
  mode: 'none' as TimerMode,
  turnTimeRemaining: 0,
  turnTimeTotal: 0,
  playerTimes: [],
};

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  phase: 'idle',
  roomCode: null,
  playerId: null,
  error: null,
  roomState: null,
  board: createBoard(),
  players: [],
  currentPlayerIndex: 0,
  myPlayerIndex: -1,
  myRack: [],
  tileBagCount: 0,
  moveHistory: [],
  timerConfig: { mode: 'none', perTurnSeconds: 0, totalSeconds: 0 },
  timerState: defaultTimerState,
  endReason: null,
  pendingPlacements: [],
  lastError: null,
  disconnectedPlayer: null,

  setPhase: (phase) => set({ phase }),
  setRoom: (code, playerId) => set({ roomCode: code, playerId }),
  setRoomState: (state) => set({ roomState: state }),

  applyGameState: (gameState) => {
    const { pendingPlacements } = get();

    // If we have pending placements, reapply them on top of the server board
    let board = gameState.board;
    let rack = gameState.myRack;
    let activePlacements: PlacedTile[] = [];

    if (pendingPlacements.length > 0 && gameState.phase === 'playing' && gameState.currentPlayerIndex === gameState.myPlayerIndex) {
      // Re-validate that pending tiles are still in our rack
      const rackIds = new Set(rack.map(t => t.id));
      activePlacements = pendingPlacements.filter(p => rackIds.has(p.tile.id));

      if (activePlacements.length > 0) {
        board = placeTiles(board, activePlacements);
        const placedIds = new Set(activePlacements.map(p => p.tile.id));
        rack = rack.filter(t => !placedIds.has(t.id));
      }
    }

    set({
      phase: gameState.phase === 'ended' ? 'ended' : 'playing',
      board,
      players: gameState.players,
      currentPlayerIndex: gameState.currentPlayerIndex,
      myPlayerIndex: gameState.myPlayerIndex,
      myRack: rack,
      tileBagCount: gameState.tileBagCount,
      moveHistory: gameState.moveHistory,
      timerConfig: gameState.timerConfig,
      timerState: gameState.timerState,
      endReason: gameState.endReason,
      pendingPlacements: activePlacements,
    });
  },

  updateTimer: (timer) => set({ timerState: timer }),

  setError: (error) => set({ error }),
  setLastError: (error) => set({ lastError: error }),
  setDisconnectedPlayer: (name) => set({ disconnectedPlayer: name }),

  placeTileOnBoard: (tile, row, col) => {
    const { pendingPlacements, myRack, board } = get();

    const tileIndex = myRack.findIndex(t => t.id === tile.id);
    if (tileIndex === -1) return;

    const newRack = [...myRack];
    newRack.splice(tileIndex, 1);

    const newPlacements = [...pendingPlacements, { tile, position: { row, col } }];
    const newBoard = placeTiles(board, [{ tile, position: { row, col } }]);

    set({
      myRack: newRack,
      pendingPlacements: newPlacements,
      board: newBoard,
      lastError: null,
    });
  },

  removeTileFromBoard: (row, col) => {
    const { pendingPlacements, myRack, board } = get();

    const placementIndex = pendingPlacements.findIndex(
      p => p.position.row === row && p.position.col === col
    );
    if (placementIndex === -1) return;

    const removedTile = pendingPlacements[placementIndex].tile;
    const newPlacements = pendingPlacements.filter((_, i) => i !== placementIndex);
    const { board: newBoard } = removeTiles(board, [{ row, col }]);

    set({
      myRack: [...myRack, removedTile],
      pendingPlacements: newPlacements,
      board: newBoard,
    });
  },

  moveTileOnBoard: (fromRow, fromCol, toRow, toCol) => {
    const { pendingPlacements, board } = get();

    const placementIndex = pendingPlacements.findIndex(
      p => p.position.row === fromRow && p.position.col === fromCol
    );
    if (placementIndex === -1) return;

    const tile = pendingPlacements[placementIndex].tile;
    const { board: boardAfterRemove } = removeTiles(board, [{ row: fromRow, col: fromCol }]);
    const newBoard = placeTiles(boardAfterRemove, [{ tile, position: { row: toRow, col: toCol } }]);

    const newPlacements = pendingPlacements.map((p, i) =>
      i === placementIndex ? { ...p, position: { row: toRow, col: toCol } } : p
    );

    set({
      board: newBoard,
      pendingPlacements: newPlacements,
      lastError: null,
    });
  },

  recallTiles: () => {
    const { pendingPlacements, myRack, board } = get();
    if (pendingPlacements.length === 0) return;

    const positions = pendingPlacements.map(p => p.position);
    const { board: newBoard } = removeTiles(board, positions);
    const returnedTiles = pendingPlacements.map(p => p.tile);

    set({
      myRack: [...myRack, ...returnedTiles],
      pendingPlacements: [],
      board: newBoard,
      lastError: null,
    });
  },

  shuffleRack: () => {
    const { myRack } = get();
    set({ myRack: shuffle(myRack) });
  },

  setBlankLetter: (tileId, letter) => {
    const { pendingPlacements, board } = get();

    const newPlacements = pendingPlacements.map(p =>
      p.tile.id === tileId
        ? { ...p, tile: { ...p.tile, designatedLetter: letter.toUpperCase() } }
        : p
    );

    let newBoard = board;
    for (const placement of newPlacements) {
      if (placement.tile.id === tileId) {
        const { row, col } = placement.position;
        newBoard = newBoard.map((r, ri) =>
          r.map((cell, ci) =>
            ri === row && ci === col
              ? { ...cell, tile: placement.tile }
              : cell
          )
        );
      }
    }

    set({ pendingPlacements: newPlacements, board: newBoard });
  },

  reset: () => set({
    phase: 'idle',
    roomCode: null,
    playerId: null,
    error: null,
    roomState: null,
    board: createBoard(),
    players: [],
    currentPlayerIndex: 0,
    myPlayerIndex: -1,
    myRack: [],
    tileBagCount: 0,
    moveHistory: [],
    timerConfig: { mode: 'none', perTurnSeconds: 0, totalSeconds: 0 },
    timerState: defaultTimerState,
    endReason: null,
    pendingPlacements: [],
    lastError: null,
    disconnectedPlayer: null,
  }),
}));

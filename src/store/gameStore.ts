import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Board, Player, Tile, PlacedTile, Move, GamePhase, TimerConfig } from '../types/index.ts';
import { createBoard, placeTiles, removeTiles } from '../engine/board.ts';
import { createTileBag, drawTiles, returnTiles, shuffle, resetIdCounter } from '../engine/tileBag.ts';
import { validateMove } from '../engine/moveValidator.ts';
import { calculateMoveScore } from '../engine/scoring.ts';
import { getNextPlayerIndex, shouldGameEnd, calculateFinalScores } from '../engine/turnManager.ts';
import { RACK_SIZE } from '../constants/board.ts';
import { DEFAULT_TIMER_CONFIG } from '../constants/timer.ts';

export interface GameStore {
  // State
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: Board;
  tileBag: Tile[];
  moveHistory: Move[];
  consecutiveScorelessTurns: number;
  timerConfig: TimerConfig;
  pendingPlacements: PlacedTile[];
  lastError: string | null;
  endReason: string | null;
  hasSavedGame: boolean;

  // Actions
  startGame: (playerNames: string[], timerConfig: TimerConfig) => void;
  placeTileOnBoard: (tile: Tile, row: number, col: number) => void;
  removeTileFromBoard: (row: number, col: number) => void;
  moveTileOnBoard: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  recallTiles: () => void;
  shuffleRack: () => void;
  commitMove: () => void;
  passTurn: () => void;
  exchangeTiles: (tiles: Tile[]) => void;
  setBlankLetter: (tileId: string, letter: string) => void;
  saveAndQuit: () => void;
  resumeSavedGame: () => void;
  resetGame: () => void;
  clearError: () => void;
}

export const useGameStore = create<GameStore>()(persist((set, get) => ({
  phase: 'setup',
  players: [],
  currentPlayerIndex: 0,
  board: createBoard(),
  tileBag: [],
  moveHistory: [],
  consecutiveScorelessTurns: 0,
  timerConfig: DEFAULT_TIMER_CONFIG,
  pendingPlacements: [],
  lastError: null,
  endReason: null,
  hasSavedGame: false,

  startGame: (playerNames, timerConfig) => {
    resetIdCounter();
    let bag = createTileBag();

    const players: Player[] = playerNames.map((name, i) => {
      const { drawn, remaining } = drawTiles(bag, RACK_SIZE);
      bag = remaining;
      return {
        id: `player-${i}`,
        name,
        score: 0,
        rack: drawn,
        isEliminated: false,
        consecutivePasses: 0,
      };
    });

    set({
      phase: 'playing',
      players,
      currentPlayerIndex: 0,
      board: createBoard(),
      tileBag: bag,
      moveHistory: [],
      consecutiveScorelessTurns: 0,
      timerConfig,
      pendingPlacements: [],
      lastError: null,
      endReason: null,
      hasSavedGame: false,
    });
  },

  placeTileOnBoard: (tile, row, col) => {
    const { pendingPlacements, players, currentPlayerIndex, board } = get();

    // Remove tile from rack
    const player = players[currentPlayerIndex];
    const tileIndex = player.rack.findIndex(t => t.id === tile.id);
    if (tileIndex === -1) return;

    const newRack = [...player.rack];
    newRack.splice(tileIndex, 1);

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, rack: newRack } : p
    );

    const newPlacements = [...pendingPlacements, { tile, position: { row, col } }];
    const newBoard = placeTiles(board, [{ tile, position: { row, col } }]);

    set({
      players: newPlayers,
      pendingPlacements: newPlacements,
      board: newBoard,
      lastError: null,
    });
  },

  removeTileFromBoard: (row, col) => {
    const { pendingPlacements, players, currentPlayerIndex, board } = get();

    const placementIndex = pendingPlacements.findIndex(
      p => p.position.row === row && p.position.col === col
    );
    if (placementIndex === -1) return; // Can only remove tiles placed this turn

    const removedTile = pendingPlacements[placementIndex].tile;
    const newPlacements = pendingPlacements.filter((_, i) => i !== placementIndex);

    const { board: newBoard } = removeTiles(board, [{ row, col }]);

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, rack: [...p.rack, removedTile] } : p
    );

    set({
      players: newPlayers,
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

    // Remove from old position
    const { board: boardAfterRemove } = removeTiles(board, [{ row: fromRow, col: fromCol }]);

    // Place at new position
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
    const { pendingPlacements, players, currentPlayerIndex, board } = get();
    if (pendingPlacements.length === 0) return;

    const positions = pendingPlacements.map(p => p.position);
    const { board: newBoard } = removeTiles(board, positions);
    const returnedTiles = pendingPlacements.map(p => p.tile);

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, rack: [...p.rack, ...returnedTiles] } : p
    );

    set({
      players: newPlayers,
      pendingPlacements: [],
      board: newBoard,
      lastError: null,
    });
  },

  shuffleRack: () => {
    const { players, currentPlayerIndex } = get();
    const player = players[currentPlayerIndex];
    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, rack: shuffle(player.rack) } : p
    );
    set({ players: newPlayers });
  },

  commitMove: () => {
    const { pendingPlacements, board, players, currentPlayerIndex, tileBag, moveHistory, consecutiveScorelessTurns } = get();

    if (pendingPlacements.length === 0) {
      set({ lastError: 'No tiles placed' });
      return;
    }

    // Build the board state before this turn's placements for validation
    const positions = pendingPlacements.map(p => p.position);
    const { board: boardBefore } = removeTiles(board, positions);

    const result = validateMove(boardBefore, board, pendingPlacements);

    if (!result.valid) {
      set({ lastError: result.error ?? 'Invalid move' });
      return;
    }

    // Calculate score
    const { wordsFormed, totalScore } = calculateMoveScore(board, result.words!, pendingPlacements);

    // Draw replacement tiles
    const { drawn, remaining } = drawTiles(tileBag, pendingPlacements.length);

    const move: Move = {
      playerId: players[currentPlayerIndex].id,
      type: 'play',
      tilesPlaced: pendingPlacements,
      wordsFormed,
      score: totalScore,
      timestamp: Date.now(),
    };

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex
        ? { ...p, score: p.score + totalScore, rack: [...p.rack, ...drawn], consecutivePasses: 0 }
        : p
    );

    const newScorelessTurns = totalScore === 0 ? consecutiveScorelessTurns + 1 : 0;
    const nextIndex = getNextPlayerIndex(newPlayers, currentPlayerIndex);

    // Check for game end
    const endCheck = shouldGameEnd(newPlayers, remaining, newScorelessTurns);

    if (endCheck.ended) {
      const finalPlayers = calculateFinalScores(newPlayers);
      set({
        phase: 'ended',
        players: finalPlayers,
        tileBag: remaining,
        moveHistory: [...moveHistory, move],
        pendingPlacements: [],
        consecutiveScorelessTurns: newScorelessTurns,
        lastError: null,
        endReason: endCheck.reason ?? null,
      });
      return;
    }

    set({
      players: newPlayers,
      currentPlayerIndex: nextIndex,
      tileBag: remaining,
      moveHistory: [...moveHistory, move],
      pendingPlacements: [],
      consecutiveScorelessTurns: newScorelessTurns,
      lastError: null,
    });
  },

  passTurn: () => {
    const { players, currentPlayerIndex, tileBag, moveHistory, consecutiveScorelessTurns } = get();

    const move: Move = {
      playerId: players[currentPlayerIndex].id,
      type: 'pass',
      score: 0,
      timestamp: Date.now(),
    };

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, consecutivePasses: p.consecutivePasses + 1 } : p
    );

    const newScorelessTurns = consecutiveScorelessTurns + 1;
    const nextIndex = getNextPlayerIndex(newPlayers, currentPlayerIndex);

    const endCheck = shouldGameEnd(newPlayers, tileBag, newScorelessTurns);
    if (endCheck.ended) {
      const finalPlayers = calculateFinalScores(newPlayers);
      set({
        phase: 'ended',
        players: finalPlayers,
        moveHistory: [...moveHistory, move],
        pendingPlacements: [],
        consecutiveScorelessTurns: newScorelessTurns,
        lastError: null,
        endReason: endCheck.reason ?? null,
      });
      return;
    }

    set({
      players: newPlayers,
      currentPlayerIndex: nextIndex,
      moveHistory: [...moveHistory, move],
      pendingPlacements: [],
      consecutiveScorelessTurns: newScorelessTurns,
      lastError: null,
    });
  },

  exchangeTiles: (tilesToExchange) => {
    const { players, currentPlayerIndex, tileBag, moveHistory, consecutiveScorelessTurns } = get();

    if (tileBag.length < tilesToExchange.length) {
      set({ lastError: 'Not enough tiles in the bag to exchange' });
      return;
    }

    const player = players[currentPlayerIndex];
    const newRack = player.rack.filter(t => !tilesToExchange.some(et => et.id === t.id));

    // Draw new tiles first, then return old ones
    const { drawn, remaining } = drawTiles(tileBag, tilesToExchange.length);
    const finalBag = returnTiles(remaining, tilesToExchange);

    const move: Move = {
      playerId: player.id,
      type: 'exchange',
      score: 0,
      timestamp: Date.now(),
    };

    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex
        ? { ...p, rack: [...newRack, ...drawn], consecutivePasses: 0 }
        : p
    );

    const newScorelessTurns = consecutiveScorelessTurns + 1;
    const nextIndex = getNextPlayerIndex(newPlayers, currentPlayerIndex);

    set({
      players: newPlayers,
      currentPlayerIndex: nextIndex,
      tileBag: finalBag,
      moveHistory: [...moveHistory, move],
      pendingPlacements: [],
      consecutiveScorelessTurns: newScorelessTurns,
      lastError: null,
    });
  },

  setBlankLetter: (tileId, letter) => {
    const { pendingPlacements, board } = get();

    const newPlacements = pendingPlacements.map(p =>
      p.tile.id === tileId
        ? { ...p, tile: { ...p.tile, designatedLetter: letter.toUpperCase() } }
        : p
    );

    // Also update the board
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

  saveAndQuit: () => {
    const state = get();
    // Recall any pending tiles before saving
    if (state.pendingPlacements.length > 0) {
      const positions = state.pendingPlacements.map(p => p.position);
      const { board: newBoard } = removeTiles(state.board, positions);
      const returnedTiles = state.pendingPlacements.map(p => p.tile);
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, rack: [...p.rack, ...returnedTiles] } : p
      );
      set({
        phase: 'setup',
        players: newPlayers,
        board: newBoard,
        pendingPlacements: [],
        lastError: null,
        hasSavedGame: true,
      });
    } else {
      set({
        phase: 'setup',
        pendingPlacements: [],
        lastError: null,
        hasSavedGame: true,
      });
    }
  },

  resumeSavedGame: () => {
    set({
      phase: 'playing',
      hasSavedGame: false,
      lastError: null,
    });
  },

  resetGame: () => {
    set({
      phase: 'setup',
      players: [],
      currentPlayerIndex: 0,
      board: createBoard(),
      tileBag: [],
      moveHistory: [],
      consecutiveScorelessTurns: 0,
      timerConfig: DEFAULT_TIMER_CONFIG,
      pendingPlacements: [],
      lastError: null,
      endReason: null,
      hasSavedGame: false,
    });
  },

  clearError: () => set({ lastError: null }),
}), {
  name: 'word-game-state',
  partialize: (state) => ({
    phase: state.phase,
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    board: state.board,
    tileBag: state.tileBag,
    moveHistory: state.moveHistory,
    consecutiveScorelessTurns: state.consecutiveScorelessTurns,
    timerConfig: state.timerConfig,
    endReason: state.endReason,
    hasSavedGame: state.hasSavedGame,
  }),
}));

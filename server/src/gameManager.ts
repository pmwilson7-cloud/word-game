import type { Board, Player, Tile, PlacedTile, Move, TimerConfig } from '../../src/types/index.ts';
import type { ClientGameState, PublicPlayer, RoomPlayer } from '../../src/types/online.ts';
import { createBoard, placeTiles, removeTiles } from '../../src/engine/board.ts';
import { createTileBag, drawTiles, returnTiles, resetIdCounter } from '../../src/engine/tileBag.ts';
import { validateMove } from '../../src/engine/moveValidator.ts';
import { calculateMoveScore } from '../../src/engine/scoring.ts';
import { getNextPlayerIndex, shouldGameEnd, calculateFinalScores } from '../../src/engine/turnManager.ts';
import { getDictionary } from '../../src/engine/dictionary.ts';
import { findAllMoves } from '../../src/engine/ai/moveFinder.ts';
import { selectMove } from '../../src/engine/ai/difficultySelector.ts';
import { RACK_SIZE } from '../../src/constants/board.ts';
import { getTimerState } from './timerManager.ts';

export interface ServerGameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  moveHistory: Move[];
  consecutiveScorelessTurns: number;
  timerConfig: TimerConfig;
  phase: 'playing' | 'ended';
  endReason: string | null;
  // Maps room playerId -> game player index
  playerIdMap: Map<string, number>;
}

const games = new Map<string, ServerGameState>();

export function startGame(roomCode: string, roomPlayers: RoomPlayer[], timerConfig: TimerConfig): ServerGameState {
  resetIdCounter();
  let bag = createTileBag();

  const playerIdMap = new Map<string, number>();

  const players: Player[] = roomPlayers.map((rp, i) => {
    const { drawn, remaining } = drawTiles(bag, RACK_SIZE);
    bag = remaining;
    playerIdMap.set(rp.id, i);
    return {
      id: rp.id,
      name: rp.name,
      score: 0,
      rack: drawn,
      isEliminated: false,
      consecutivePasses: 0,
      isAI: rp.isAI,
      aiDifficulty: rp.aiDifficulty,
    };
  });

  const state: ServerGameState = {
    board: createBoard(),
    players,
    currentPlayerIndex: 0,
    tileBag: bag,
    moveHistory: [],
    consecutiveScorelessTurns: 0,
    timerConfig,
    phase: 'playing',
    endReason: null,
    playerIdMap,
  };

  games.set(roomCode, state);
  return state;
}

export function getGame(roomCode: string): ServerGameState | undefined {
  return games.get(roomCode);
}

export function commitMove(roomCode: string, playerId: string, placements: PlacedTile[]): { ok: true } | { ok: false; error: string } {
  const state = games.get(roomCode);
  if (!state) return { ok: false, error: 'Game not found' };
  if (state.phase !== 'playing') return { ok: false, error: 'Game not in progress' };

  const playerIndex = state.playerIdMap.get(playerId);
  if (playerIndex === undefined) return { ok: false, error: 'Player not in game' };
  if (playerIndex !== state.currentPlayerIndex) return { ok: false, error: 'Not your turn' };
  if (placements.length === 0) return { ok: false, error: 'No tiles placed' };

  // Verify placed tiles are in the player's rack
  const player = state.players[playerIndex];
  const rackTileIds = new Set(player.rack.map(t => t.id));
  for (const p of placements) {
    if (!rackTileIds.has(p.tile.id)) {
      return { ok: false, error: 'Tile not in your rack' };
    }
  }

  // Place tiles on board
  const newBoard = placeTiles(state.board, placements);

  // Build pre-placement board for validation
  const positions = placements.map(p => p.position);
  const { board: boardBefore } = removeTiles(state.board, positions);

  const result = validateMove(boardBefore, newBoard, placements);
  if (!result.valid) {
    return { ok: false, error: result.error ?? 'Invalid move' };
  }

  const { wordsFormed, totalScore } = calculateMoveScore(newBoard, result.words!, placements);
  const { drawn, remaining } = drawTiles(state.tileBag, placements.length);

  const move: Move = {
    playerId: player.id,
    type: 'play',
    tilesPlaced: placements,
    wordsFormed,
    score: totalScore,
    timestamp: Date.now(),
  };

  const placedTileIds = new Set(placements.map(p => p.tile.id));
  state.players = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          score: p.score + totalScore,
          rack: [...p.rack.filter(t => !placedTileIds.has(t.id)), ...drawn],
          consecutivePasses: 0,
        }
      : p
  );

  state.board = newBoard;
  state.tileBag = remaining;
  state.moveHistory = [...state.moveHistory, move];
  state.consecutiveScorelessTurns = totalScore === 0 ? state.consecutiveScorelessTurns + 1 : 0;

  const endCheck = shouldGameEnd(state.players, state.tileBag, state.consecutiveScorelessTurns);
  if (endCheck.ended) {
    state.players = calculateFinalScores(state.players);
    state.phase = 'ended';
    state.endReason = endCheck.reason ?? null;
  } else {
    state.currentPlayerIndex = getNextPlayerIndex(state.players, playerIndex);
  }

  return { ok: true };
}

export function passTurn(roomCode: string, playerId: string): { ok: true } | { ok: false; error: string } {
  const state = games.get(roomCode);
  if (!state) return { ok: false, error: 'Game not found' };
  if (state.phase !== 'playing') return { ok: false, error: 'Game not in progress' };

  const playerIndex = state.playerIdMap.get(playerId);
  if (playerIndex === undefined) return { ok: false, error: 'Player not in game' };
  if (playerIndex !== state.currentPlayerIndex) return { ok: false, error: 'Not your turn' };

  const move: Move = {
    playerId: state.players[playerIndex].id,
    type: 'pass',
    score: 0,
    timestamp: Date.now(),
  };

  state.players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, consecutivePasses: p.consecutivePasses + 1 } : p
  );

  state.moveHistory = [...state.moveHistory, move];
  state.consecutiveScorelessTurns += 1;

  const endCheck = shouldGameEnd(state.players, state.tileBag, state.consecutiveScorelessTurns);
  if (endCheck.ended) {
    state.players = calculateFinalScores(state.players);
    state.phase = 'ended';
    state.endReason = endCheck.reason ?? null;
  } else {
    state.currentPlayerIndex = getNextPlayerIndex(state.players, playerIndex);
  }

  return { ok: true };
}

export function exchangeTiles(roomCode: string, playerId: string, tileIds: string[]): { ok: true } | { ok: false; error: string } {
  const state = games.get(roomCode);
  if (!state) return { ok: false, error: 'Game not found' };
  if (state.phase !== 'playing') return { ok: false, error: 'Game not in progress' };

  const playerIndex = state.playerIdMap.get(playerId);
  if (playerIndex === undefined) return { ok: false, error: 'Player not in game' };
  if (playerIndex !== state.currentPlayerIndex) return { ok: false, error: 'Not your turn' };

  const player = state.players[playerIndex];
  const tileIdSet = new Set(tileIds);
  const tilesToExchange = player.rack.filter(t => tileIdSet.has(t.id));

  if (tilesToExchange.length !== tileIds.length) {
    return { ok: false, error: 'Some tiles not found in rack' };
  }
  if (state.tileBag.length < tilesToExchange.length) {
    return { ok: false, error: 'Not enough tiles in bag' };
  }

  const newRack = player.rack.filter(t => !tileIdSet.has(t.id));
  const { drawn, remaining } = drawTiles(state.tileBag, tilesToExchange.length);
  const finalBag = returnTiles(remaining, tilesToExchange);

  const move: Move = {
    playerId: player.id,
    type: 'exchange',
    score: 0,
    timestamp: Date.now(),
  };

  state.players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, rack: [...newRack, ...drawn], consecutivePasses: 0 }
      : p
  );

  state.tileBag = finalBag;
  state.moveHistory = [...state.moveHistory, move];
  state.consecutiveScorelessTurns += 1;

  const endCheck = shouldGameEnd(state.players, state.tileBag, state.consecutiveScorelessTurns);
  if (endCheck.ended) {
    state.players = calculateFinalScores(state.players);
    state.phase = 'ended';
    state.endReason = endCheck.reason ?? null;
  } else {
    state.currentPlayerIndex = getNextPlayerIndex(state.players, playerIndex);
  }

  return { ok: true };
}

export function setBlankLetter(roomCode: string, playerId: string, tileId: string, letter: string): void {
  const state = games.get(roomCode);
  if (!state) return;

  const playerIndex = state.playerIdMap.get(playerId);
  if (playerIndex === undefined) return;

  state.players = state.players.map((p, i) =>
    i === playerIndex
      ? {
          ...p,
          rack: p.rack.map(t =>
            t.id === tileId ? { ...t, designatedLetter: letter.toUpperCase() } : t
          ),
        }
      : p
  );
}

export function processAITurn(roomCode: string): boolean {
  const state = games.get(roomCode);
  if (!state || state.phase !== 'playing') return false;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer?.isAI) return false;

  const dictionary = getDictionary();
  if (!dictionary) {
    // Fallback: pass
    const playerId = currentPlayer.id;
    passTurn(roomCode, playerId);
    return true;
  }

  const allMoves = findAllMoves(state.board, currentPlayer.rack, dictionary);
  const difficulty = currentPlayer.aiDifficulty ?? 'medium';
  const chosen = selectMove(allMoves, difficulty);

  if (chosen) {
    commitMove(roomCode, currentPlayer.id, chosen.placements);
  } else {
    if (state.tileBag.length >= 7) {
      const tileIds = currentPlayer.rack.slice(0, Math.min(currentPlayer.rack.length, 7)).map(t => t.id);
      exchangeTiles(roomCode, currentPlayer.id, tileIds);
    } else {
      passTurn(roomCode, currentPlayer.id);
    }
  }

  return true;
}

export function getClientGameState(roomCode: string, playerId: string): ClientGameState | null {
  const state = games.get(roomCode);
  if (!state) return null;

  const myPlayerIndex = state.playerIdMap.get(playerId);
  if (myPlayerIndex === undefined) return null;

  const timerState = getTimerState(roomCode);

  const publicPlayers: PublicPlayer[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    rackCount: p.rack.length,
    isEliminated: p.isEliminated,
    consecutivePasses: p.consecutivePasses,
    isAI: p.isAI,
    aiDifficulty: p.aiDifficulty,
  }));

  return {
    board: state.board,
    players: publicPlayers,
    currentPlayerIndex: state.currentPlayerIndex,
    myPlayerIndex,
    myRack: state.players[myPlayerIndex].rack,
    tileBagCount: state.tileBag.length,
    moveHistory: state.moveHistory,
    consecutiveScorelessTurns: state.consecutiveScorelessTurns,
    timerConfig: state.timerConfig,
    timerState: timerState ?? { mode: 'none', turnTimeRemaining: 0, turnTimeTotal: 0, playerTimes: [] },
    phase: state.phase,
    endReason: state.endReason,
  };
}

export function cleanupGame(roomCode: string): void {
  games.delete(roomCode);
}

import type { Board, BoardCell, Tile, Position, PlacedTile } from '../types/index.ts';
import { BOARD_SIZE, PREMIUM_LAYOUT } from '../constants/board.ts';

export function createBoard(): Board {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const boardRow: BoardCell[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      boardRow.push({
        position: { row, col },
        tile: null,
        premium: PREMIUM_LAYOUT[row][col],
      });
    }
    board.push(boardRow);
  }
  return board;
}

export function getCell(board: Board, pos: Position): BoardCell {
  return board[pos.row][pos.col];
}

export function placeTile(board: Board, tile: Tile, pos: Position): Board {
  return board.map((row, r) =>
    row.map((cell, c) =>
      r === pos.row && c === pos.col ? { ...cell, tile } : cell
    )
  );
}

export function removeTile(board: Board, pos: Position): { board: Board; tile: Tile | null } {
  const cell = getCell(board, pos);
  const tile = cell.tile;
  const newBoard = board.map((row, r) =>
    row.map((cell, c) =>
      r === pos.row && c === pos.col ? { ...cell, tile: null } : cell
    )
  );
  return { board: newBoard, tile };
}

export function placeTiles(board: Board, placements: PlacedTile[]): Board {
  let result = board;
  for (const { tile, position } of placements) {
    result = placeTile(result, tile, position);
  }
  return result;
}

export function removeTiles(board: Board, positions: Position[]): { board: Board; tiles: Tile[] } {
  let result = board;
  const tiles: Tile[] = [];
  for (const pos of positions) {
    const { board: newBoard, tile } = removeTile(result, pos);
    result = newBoard;
    if (tile) tiles.push(tile);
  }
  return { board: result, tiles };
}

export function isCellEmpty(board: Board, pos: Position): boolean {
  return getCell(board, pos).tile === null;
}

export function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function getBoardTileCount(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.tile) count++;
    }
  }
  return count;
}

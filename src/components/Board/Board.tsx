import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Board as BoardType, BoardCell, PremiumType } from '../../types/index.ts';
import { Tile } from '../Tile/Tile.tsx';
import styles from './Board.module.css';

interface BoardProps {
  board: BoardType;
  pendingPositions: Set<string>;
  validWordPositions?: Set<string>;
  onCellClick: (row: number, col: number) => void;
}

const PREMIUM_LABELS: Partial<Record<PremiumType, string>> = {
  dl: 'DL',
  tl: 'TL',
  dw: 'DW',
  tw: 'TW',
  star: '\u2605',
};

const BoardCellComponent = memo(function BoardCellComponent({ cell, isPending, isValidWord, onCellClick }: {
  cell: BoardCell;
  isPending: boolean;
  isValidWord: boolean;
  onCellClick: (row: number, col: number) => void;
}) {
  const { row, col } = cell.position;
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
    disabled: cell.tile !== null,
  });

  const classNames = [
    styles.cell,
    styles[cell.premium],
    isOver && !cell.tile && styles.dropTarget,
    isPending && styles.pending,
    isValidWord && styles.validWord,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      onClick={() => isPending && onCellClick(row, col)}
    >
      {cell.tile ? (
        <Tile tile={cell.tile} isOnBoard isPending={isPending} isValidWord={isValidWord} boardRow={row} boardCol={col} onClick={() => isPending && onCellClick(row, col)} />
      ) : (
        <span className={styles.premiumLabel}>
          {PREMIUM_LABELS[cell.premium] ?? ''}
        </span>
      )}
    </div>
  );
});

export function Board({ board, pendingPositions, validWordPositions, onCellClick }: BoardProps) {
  return (
    <div className={styles.board}>
      {board.flatMap((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          return (
            <BoardCellComponent
              key={`${r}-${c}`}
              cell={cell}
              isPending={pendingPositions.has(key)}
              isValidWord={validWordPositions?.has(key) ?? false}
              onCellClick={onCellClick}
            />
          );
        })
      )}
    </div>
  );
}

import { useDraggable } from '@dnd-kit/core';
import type { Tile as TileType } from '../../types/index.ts';
import styles from './Tile.module.css';

interface TileProps {
  tile: TileType;
  isOnBoard?: boolean;
  isPending?: boolean;
  isRackTile?: boolean;
  isSelected?: boolean;
  isValidWord?: boolean;
  boardRow?: number;
  boardCol?: number;
  onClick?: () => void;
}

export function Tile({ tile, isOnBoard, isPending, isRackTile, isSelected, isValidWord, boardRow, boardCol, onClick }: TileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tile.id,
    data: { tile, source: isOnBoard ? 'board' : 'rack', sourceRow: boardRow, sourceCol: boardCol },
    disabled: isOnBoard && !isPending,
  });

  const displayLetter = tile.isBlank
    ? (tile.designatedLetter ?? '?')
    : tile.letter;

  const canDrag = !isOnBoard || isPending;

  const classNames = [
    styles.tile,
    isDragging && styles.dragging,
    tile.isBlank && styles.blank,
    isOnBoard && !isPending && styles.placed,
    isPending && styles.pending,
    isPending && styles.draggablePending,
    isRackTile && styles.rackTile,
    isSelected && styles.selected,
    isValidWord && styles.validWord,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      onClick={onClick}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      <span className={styles.letter}>{displayLetter}</span>
      {tile.points > 0 && (
        <span className={styles.points}>{tile.points}</span>
      )}
    </div>
  );
}

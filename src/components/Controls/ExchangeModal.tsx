import { useState } from 'react';
import type { Tile as TileType } from '../../types/index.ts';
import { Tile } from '../Tile/Tile.tsx';
import modal from '../../styles/Modal.module.css';
import styles from './Controls.module.css';

interface ExchangeModalProps {
  rack: TileType[];
  onConfirm: (tiles: TileType[]) => void;
  onCancel: () => void;
}

export function ExchangeModal({ rack, onConfirm, onCancel }: ExchangeModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectedTiles = rack.filter(t => selected.has(t.id));

  return (
    <div className={modal.overlay}>
      <div className={modal.panel}>
        <h3>Select tiles to exchange</h3>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {rack.map(tile => (
            <Tile
              key={tile.id}
              tile={tile}
              isRackTile
              isSelected={selected.has(tile.id)}
              onClick={() => toggle(tile.id)}
            />
          ))}
        </div>
        <div className={modal.actions}>
          <button
            className={`${styles.btn} ${styles.btnPlay}`}
            disabled={selected.size === 0}
            onClick={() => onConfirm(selectedTiles)}
          >
            Exchange {selected.size} tile{selected.size !== 1 ? 's' : ''}
          </button>
          <button className={`${styles.btn} ${styles.btnPass}`} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

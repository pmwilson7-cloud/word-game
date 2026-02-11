import type { Tile as TileType } from '../../types/index.ts';
import { Tile } from '../Tile/Tile.tsx';
import styles from './Rack.module.css';

interface RackProps {
  tiles: TileType[];
  selectedTiles?: Set<string>;
  onTileClick?: (tileId: string) => void;
}

export function Rack({ tiles, selectedTiles, onTileClick }: RackProps) {
  return (
    <div className={styles.rack}>
      {tiles.length === 0 ? (
        <span className={styles.empty}>No tiles</span>
      ) : (
        tiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            isRackTile
            isSelected={selectedTiles?.has(tile.id)}
            onClick={() => onTileClick?.(tile.id)}
          />
        ))
      )}
    </div>
  );
}

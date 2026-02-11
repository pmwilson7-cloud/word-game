import type { Move, Player } from '../../types/index.ts';
import styles from './History.module.css';

interface HistoryProps {
  moves: Move[];
  players: Player[];
}

export function History({ moves, players }: HistoryProps) {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? id;

  return (
    <div className={styles.history}>
      <div className={styles.title}>Move History</div>
      {moves.length === 0 ? (
        <div className={styles.empty}>No moves yet</div>
      ) : (
        [...moves].reverse().map((move, i) => (
          <div key={i} className={styles.entry}>
            <div>
              <span className={styles.player}>{getPlayerName(move.playerId)}</span>
              {move.type === 'pass' && ' passed'}
              {move.type === 'exchange' && ' exchanged'}
              {move.type === 'play' && move.wordsFormed && (
                <div className={styles.words}>
                  {move.wordsFormed.map(w => w.word).join(', ')}
                </div>
              )}
            </div>
            {move.type === 'play' && (
              <span className={styles.score}>+{move.score}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

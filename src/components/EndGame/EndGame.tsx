import type { Player } from '../../types/index.ts';
import { getWinner } from '../../engine/turnManager.ts';
import styles from './EndGame.module.css';

interface EndGameProps {
  players: Player[];
  reason: string | null;
  onPlayAgain: () => void;
}

export function EndGame({ players, reason, onPlayAgain }: EndGameProps) {
  const winner = getWinner(players);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {winner ? `${winner.name} Wins!` : 'Game Over'}
        </h2>
        {reason && <p className={styles.reason}>{reason}</p>}
        <div className={styles.standings}>
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`${styles.standing} ${i === 0 ? styles.winner : ''}`}
            >
              <span className={styles.rank}>
                #{i + 1} {player.name}
                {player.isEliminated ? ' (eliminated)' : ''}
              </span>
              <span className={styles.standingScore}>{player.score}</span>
            </div>
          ))}
        </div>
        <button className={styles.playAgain} onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

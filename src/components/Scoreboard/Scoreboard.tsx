import type { Player } from '../../types/index.ts';
import { useTimerStore } from '../../store/timerStore.ts';
import { formatTime } from '../../utils/helpers.ts';
import styles from './Scoreboard.module.css';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
}

export function Scoreboard({ players, currentPlayerIndex }: ScoreboardProps) {
  const timer = useTimerStore();

  return (
    <div className={styles.scoreboard}>
      {players.map((player, i) => {
        const isActive = i === currentPlayerIndex;
        let timerValue: number | null = null;

        if (timer.mode === 'per-turn' && isActive) {
          timerValue = timer.turnTimeRemaining;
        } else if (timer.mode === 'chess-clock') {
          timerValue = timer.playerTimes[i] ?? null;
        }

        const timerClass = timerValue !== null && timerValue < 10
          ? styles.timerDanger
          : timerValue !== null && timerValue < 30
            ? styles.timerWarning
            : styles.timerDisplay;

        return (
          <div
            key={player.id}
            className={[
              styles.playerCard,
              isActive && styles.active,
              player.isEliminated && styles.eliminated,
            ].filter(Boolean).join(' ')}
          >
            <div className={styles.name}>{player.name}</div>
            <div className={styles.score}>{player.score}</div>
            {timerValue !== null && (
              <div className={timerClass}>{formatTime(timerValue)}</div>
            )}
            <div className={styles.tilesLeft}>{player.rack.length} tiles</div>
          </div>
        );
      })}
    </div>
  );
}

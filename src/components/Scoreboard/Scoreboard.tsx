import { useRef, useEffect, useState } from 'react';
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
  const prevScores = useRef<Record<string, number>>({});
  const [poppingIds, setPoppingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newPopping = new Set<string>();
    for (const player of players) {
      const prev = prevScores.current[player.id];
      if (prev !== undefined && prev !== player.score) {
        newPopping.add(player.id);
      }
      prevScores.current[player.id] = player.score;
    }
    if (newPopping.size > 0) {
      setPoppingIds(newPopping);
      const timeout = setTimeout(() => setPoppingIds(new Set()), 400);
      return () => clearTimeout(timeout);
    }
  }, [players]);

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
            <div className={styles.name}>
              {player.name}
              {player.isAI && <span className={styles.aiBadge}>AI</span>}
            </div>
            <div className={[
              styles.score,
              poppingIds.has(player.id) && styles.scorePop,
            ].filter(Boolean).join(' ')}>
              {player.score}
            </div>
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

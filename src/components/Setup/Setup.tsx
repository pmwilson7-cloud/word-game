import { useState, useEffect } from 'react';
import type { TimerConfig } from '../../types/index.ts';
import { TIMER_PRESETS } from '../../constants/timer.ts';
import { loadDictionary, isDictionaryLoaded } from '../../engine/dictionary.ts';
import styles from './Setup.module.css';

interface SetupProps {
  onStart: (playerNames: string[], timerConfig: TimerConfig) => void;
  hasSavedGame?: boolean;
  onResumeSavedGame?: () => void;
}

export function Setup({ onStart, hasSavedGame, onResumeSavedGame }: SetupProps) {
  const [names, setNames] = useState(['Player 1', 'Player 2']);
  const [timerIndex, setTimerIndex] = useState(0);
  const [dictLoaded, setDictLoaded] = useState(isDictionaryLoaded());
  const [dictError, setDictError] = useState(false);

  useEffect(() => {
    loadDictionary()
      .then(() => setDictLoaded(true))
      .catch(() => setDictError(true));
  }, []);

  const addPlayer = () => {
    if (names.length < 4) {
      setNames([...names, `Player ${names.length + 1}`]);
    }
  };

  const removePlayer = (index: number) => {
    if (names.length > 2) {
      setNames(names.filter((_, i) => i !== index));
    }
  };

  const updateName = (index: number, name: string) => {
    setNames(names.map((n, i) => (i === index ? name : n)));
  };

  const canStart = dictLoaded && names.every(n => n.trim().length > 0);

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>Speed Words</h1>
      <p className={styles.subtitle}>A multiplayer word game with a twist</p>

      {hasSavedGame && onResumeSavedGame && (
        <button
          className={styles.resumeBtn}
          onClick={onResumeSavedGame}
        >
          Continue Saved Game
        </button>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Players</div>
        <div className={styles.playerInputs}>
          {names.map((name, i) => (
            <div key={i} className={styles.playerRow}>
              <input
                className={styles.playerInput}
                value={name}
                onChange={e => updateName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                maxLength={20}
              />
              {names.length > 2 && (
                <button className={styles.removeBtn} onClick={() => removePlayer(i)}>
                  &times;
                </button>
              )}
            </div>
          ))}
          {names.length < 4 && (
            <button className={styles.addBtn} onClick={addPlayer}>
              + Add Player
            </button>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Timer</div>
        <div className={styles.timerOptions}>
          {TIMER_PRESETS.map((preset, i) => (
            <button
              key={i}
              className={`${styles.timerOption} ${i === timerIndex ? styles.selected : ''}`}
              onClick={() => setTimerIndex(i)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {!dictLoaded && !dictError && (
        <p className={styles.loadingMsg}>Loading dictionary...</p>
      )}
      {dictError && (
        <p className={styles.loadingMsg} style={{ color: 'var(--color-primary)' }}>
          Failed to load dictionary. Place sowpods.txt in the public/ folder.
        </p>
      )}

      <button
        className={styles.startBtn}
        disabled={!canStart}
        onClick={() => onStart(names, TIMER_PRESETS[timerIndex].config)}
      >
        Start Game
      </button>
    </div>
  );
}

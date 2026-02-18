import { useState, useEffect } from 'react';
import type { TimerConfig, PlayerConfig, AIDifficulty } from '../../types/index.ts';
import { TIMER_PRESETS } from '../../constants/timer.ts';
import { loadDictionary, isDictionaryLoaded } from '../../engine/dictionary.ts';
import { useUiStore } from '../../store/uiStore.ts';
import styles from './Setup.module.css';

interface PlayerSetup {
  name: string;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
}

interface SetupProps {
  onStart: (configs: PlayerConfig[], timerConfig: TimerConfig) => void;
  hasSavedGame?: boolean;
  onResumeSavedGame?: () => void;
  onPlayOnline?: () => void;
}

function defaultName(index: number, isAI: boolean, difficulty: AIDifficulty): string {
  if (isAI) return `CPU (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`;
  return `Player ${index + 1}`;
}

export function Setup({ onStart, hasSavedGame, onResumeSavedGame, onPlayOnline }: SetupProps) {
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([
    { name: 'Player 1', isAI: false, aiDifficulty: 'medium' },
    { name: 'Player 2', isAI: false, aiDifficulty: 'medium' },
  ]);
  const [timerIndex, setTimerIndex] = useState(0);
  const [dictLoaded, setDictLoaded] = useState(isDictionaryLoaded());
  const [dictError, setDictError] = useState(false);

  useEffect(() => {
    loadDictionary()
      .then(() => setDictLoaded(true))
      .catch(() => setDictError(true));
  }, []);

  const addPlayer = () => {
    if (playerSetups.length < 4) {
      setPlayerSetups([
        ...playerSetups,
        { name: `Player ${playerSetups.length + 1}`, isAI: false, aiDifficulty: 'medium' },
      ]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerSetups.length > 2) {
      setPlayerSetups(playerSetups.filter((_, i) => i !== index));
    }
  };

  const updateName = (index: number, name: string) => {
    setPlayerSetups(playerSetups.map((p, i) => (i === index ? { ...p, name } : p)));
  };

  const toggleAI = (index: number) => {
    setPlayerSetups(playerSetups.map((p, i) => {
      if (i !== index) return p;
      const newIsAI = !p.isAI;
      return {
        ...p,
        isAI: newIsAI,
        name: defaultName(i, newIsAI, p.aiDifficulty),
      };
    }));
  };

  const setDifficulty = (index: number, difficulty: AIDifficulty) => {
    setPlayerSetups(playerSetups.map((p, i) => {
      if (i !== index) return p;
      return {
        ...p,
        aiDifficulty: difficulty,
        name: p.isAI ? defaultName(i, true, difficulty) : p.name,
      };
    }));
  };

  const hasHuman = playerSetups.some(p => !p.isAI);
  const canStart = dictLoaded && hasHuman && playerSetups.every(p => p.name.trim().length > 0);

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>Speed Words</h1>
      <p className={styles.subtitle}>A multiplayer word game with a twist</p>
      <button className={styles.addBtn} onClick={() => useUiStore.getState().openRules()}>
        Rules
      </button>

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
          {playerSetups.map((setup, i) => (
            <div key={i} className={styles.playerRow}>
              <input
                className={styles.playerInput}
                value={setup.name}
                onChange={e => updateName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                maxLength={20}
                disabled={setup.isAI}
              />
              <button
                className={`${styles.aiToggle} ${setup.isAI ? styles.aiToggleActive : ''}`}
                onClick={() => toggleAI(i)}
                type="button"
              >
                {setup.isAI ? 'AI' : 'Human'}
              </button>
              {setup.isAI && (
                <select
                  className={styles.difficultySelect}
                  value={setup.aiDifficulty}
                  onChange={e => setDifficulty(i, e.target.value as AIDifficulty)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              )}
              {playerSetups.length > 2 && (
                <button className={styles.removeBtn} onClick={() => removePlayer(i)}>
                  &times;
                </button>
              )}
            </div>
          ))}
          {playerSetups.length < 4 && (
            <button className={styles.addBtn} onClick={addPlayer}>
              + Add Player
            </button>
          )}
        </div>
        {!hasHuman && (
          <p className={styles.warningMsg}>At least one human player is required</p>
        )}
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
        onClick={() =>
          onStart(
            playerSetups.map(p => ({
              name: p.name,
              isAI: p.isAI,
              aiDifficulty: p.isAI ? p.aiDifficulty : undefined,
            })),
            TIMER_PRESETS[timerIndex].config
          )
        }
      >
        Start Local Game
      </button>

      {onPlayOnline && (
        <button
          className={styles.onlineBtn}
          onClick={onPlayOnline}
        >
          Play Online
        </button>
      )}
    </div>
  );
}

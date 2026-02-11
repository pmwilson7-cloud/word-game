import type { ScorePreview } from '../../hooks/useScorePreview.ts';
import styles from './Controls.module.css';

interface ControlsProps {
  onPlay: () => void;
  onPass: () => void;
  onExchange: () => void;
  onRecall: () => void;
  onShuffle: () => void;
  onPause?: () => void;
  onExit?: () => void;
  hasPendingTiles: boolean;
  canExchange: boolean;
  error: string | null;
  tilesInBag: number;
  scorePreview?: ScorePreview | null;
}

export function Controls({
  onPlay,
  onPass,
  onExchange,
  onRecall,
  onShuffle,
  onPause,
  onExit,
  hasPendingTiles,
  canExchange,
  error,
  tilesInBag,
  scorePreview,
}: ControlsProps) {
  return (
    <div className={styles.controls}>
      {scorePreview?.valid && (
        <div className={styles.scorePreview}>
          <span className={styles.scoreTotal}>+{scorePreview.totalScore}</span>
          <span className={styles.scoreWords}>
            {scorePreview.words.map(w => `${w.word} (${w.score})`).join(', ')}
          </span>
        </div>
      )}
      <button className={`${styles.btn} ${styles.btnPlay}`} onClick={onPlay} disabled={!hasPendingTiles}>
        Play
      </button>
      <button className={`${styles.btn} ${styles.btnPass}`} onClick={onPass}>
        Pass
      </button>
      <button
        className={`${styles.btn} ${styles.btnExchange}`}
        onClick={onExchange}
        disabled={!canExchange}
      >
        Exchange
      </button>
      <button className={`${styles.btn} ${styles.btnRecall}`} onClick={onRecall} disabled={!hasPendingTiles}>
        Recall
      </button>
      <button className={`${styles.btn} ${styles.btnShuffle}`} onClick={onShuffle}>
        Shuffle
      </button>
      {onPause && (
        <button className={`${styles.btn} ${styles.btnPause}`} onClick={onPause}>
          Pause
        </button>
      )}
      {onExit && (
        <button className={`${styles.btn} ${styles.btnExit}`} onClick={onExit}>
          Exit
        </button>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.bagCount}>{tilesInBag} tiles in bag</div>
    </div>
  );
}

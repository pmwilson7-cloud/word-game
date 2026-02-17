import modal from '../../styles/Modal.module.css';
import styles from './Controls.module.css';

interface BlankTileModalProps {
  onSelect: (letter: string) => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function BlankTileModal({ onSelect }: BlankTileModalProps) {
  return (
    <div className={modal.overlay}>
      <div className={`${modal.panel} ${modal.panelSmall}`}>
        <h3>Choose a letter for blank tile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {LETTERS.map(letter => (
            <button
              key={letter}
              className={`${styles.btn} ${styles.btnPass}`}
              style={{ padding: '8px 0', fontSize: 16, fontWeight: 700 }}
              onClick={() => onSelect(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

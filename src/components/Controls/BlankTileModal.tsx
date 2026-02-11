import styles from './Controls.module.css';

interface BlankTileModalProps {
  onSelect: (letter: string) => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function BlankTileModal({ onSelect }: BlankTileModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        padding: '24px 32px', textAlign: 'center', maxWidth: 360, width: '90%'
      }}>
        <h3 style={{ marginBottom: 12 }}>Choose a letter for blank tile</h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4
        }}>
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

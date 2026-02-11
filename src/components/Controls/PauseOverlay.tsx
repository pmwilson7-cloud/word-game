interface PauseOverlayProps {
  onResume: () => void;
  onSaveAndQuit: () => void;
  onExit: () => void;
}

export function PauseOverlay({ onResume, onSaveAndQuit, onExit }: PauseOverlayProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      flexDirection: 'column', gap: 20
    }}>
      <h2 style={{ fontSize: 32, fontWeight: 800 }}>Game Paused</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          style={{
            background: 'var(--color-primary)', color: 'white',
            fontSize: 18, fontWeight: 700, padding: '14px 40px',
            borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
          }}
          onClick={onResume}
        >
          Resume
        </button>
        <button
          style={{
            background: '#ff9800', color: 'white',
            fontSize: 18, fontWeight: 700, padding: '14px 40px',
            borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
          }}
          onClick={onSaveAndQuit}
        >
          Save & Quit
        </button>
        <button
          style={{
            background: '#c62828', color: 'white',
            fontSize: 18, fontWeight: 700, padding: '14px 40px',
            borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
          }}
          onClick={onExit}
        >
          Exit Game
        </button>
      </div>
    </div>
  );
}

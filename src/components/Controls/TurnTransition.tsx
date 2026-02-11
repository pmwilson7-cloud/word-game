interface TurnTransitionProps {
  playerName: string;
  onReady: () => void;
}

export function TurnTransition({ playerName, onReady }: TurnTransitionProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      flexDirection: 'column', gap: 20
    }}>
      <h2 style={{ fontSize: 32, fontWeight: 800 }}>
        Pass to <span style={{ color: 'var(--color-primary)' }}>{playerName}</span>
      </h2>
      <p style={{ color: 'var(--color-text-muted)' }}>Click when ready</p>
      <button
        style={{
          background: 'var(--color-primary)', color: 'white',
          fontSize: 18, fontWeight: 700, padding: '14px 40px',
          borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
        }}
        onClick={onReady}
      >
        I'm Ready
      </button>
    </div>
  );
}

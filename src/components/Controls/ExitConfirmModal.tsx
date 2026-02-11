interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmModal({ onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110,
      flexDirection: 'column', gap: 20
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 800 }}>Exit Game?</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>
        Your progress will be lost.
      </p>
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          style={{
            background: '#c62828', color: 'white',
            fontSize: 18, fontWeight: 700, padding: '14px 40px',
            borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
          }}
          onClick={onConfirm}
        >
          Exit
        </button>
        <button
          style={{
            background: 'var(--color-surface-alt)', color: 'var(--color-text)',
            fontSize: 18, fontWeight: 700, padding: '14px 40px',
            borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer'
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

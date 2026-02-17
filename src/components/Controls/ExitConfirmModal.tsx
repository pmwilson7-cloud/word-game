import modal from '../../styles/Modal.module.css';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmModal({ onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <div className={`${modal.overlay} ${modal.overlayTop}`}>
      <div className={modal.panel}>
        <h3>Exit Game?</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 16, marginBottom: 16 }}>
          Your progress will be lost.
        </p>
        <div className={modal.actions}>
          <button className={`${modal.btn} ${modal.btnDanger}`} onClick={onConfirm}>
            Exit
          </button>
          <button className={`${modal.btn} ${modal.btnSecondary}`} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

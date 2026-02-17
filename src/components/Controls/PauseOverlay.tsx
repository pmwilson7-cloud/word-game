import modal from '../../styles/Modal.module.css';

import { useUiStore } from '../../store/uiStore.ts';

interface PauseOverlayProps {
  onResume: () => void;
  onSaveAndQuit: () => void;
  onExit: () => void;
}

export function PauseOverlay({ onResume, onSaveAndQuit, onExit }: PauseOverlayProps) {
  return (
    <div className={modal.overlay}>
      <div className={modal.fullScreen}>
        <h2>Game Paused</h2>
        <div className={modal.actions}>
          <button className={`${modal.btn} ${modal.btnPrimary}`} onClick={onResume}>
            Resume
          </button>
          <button className={`${modal.btn} ${modal.btnWarning}`} onClick={onSaveAndQuit}>
            Save & Quit
          </button>
          <button className={`${modal.btn} ${modal.btnSecondary}`} onClick={() => useUiStore.getState().openRules()}>
            Rules
          </button>
          <button className={`${modal.btn} ${modal.btnDanger}`} onClick={onExit}>
            Exit Game
          </button>
        </div>
      </div>
    </div>
  );
}

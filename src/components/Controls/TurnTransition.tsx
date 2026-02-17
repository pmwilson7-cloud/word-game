import modal from '../../styles/Modal.module.css';

interface TurnTransitionProps {
  playerName: string;
  onReady: () => void;
}

export function TurnTransition({ playerName, onReady }: TurnTransitionProps) {
  return (
    <div className={modal.overlay}>
      <div className={modal.fullScreen}>
        <h2>
          Pass to <span style={{ color: 'var(--color-primary)' }}>{playerName}</span>
        </h2>
        <p>Click when ready</p>
        <button className={`${modal.btn} ${modal.btnPrimary}`} onClick={onReady}>
          I'm Ready
        </button>
      </div>
    </div>
  );
}

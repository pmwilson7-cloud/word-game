import { useState } from 'react';
import { useLobby } from '../../hooks/useLobby.ts';
import { TIMER_PRESETS } from '../../constants/timer.ts';
import styles from './Lobby.module.css';

interface LobbyProps {
  onBack: () => void;
}

export function Lobby({ onBack }: LobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [timerIndex, setTimerIndex] = useState(0);
  const lobby = useLobby();

  const handleCreate = () => {
    if (!playerName.trim()) return;
    lobby.createRoom(playerName.trim(), TIMER_PRESETS[timerIndex].config);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    lobby.joinRoom(roomCode.trim(), playerName.trim());
  };

  if (mode === 'menu') {
    return (
      <div className={styles.lobby}>
        <h1 className={styles.title}>Play Online</h1>
        <p className={styles.subtitle}>Play with friends on separate devices</p>

        <div className={styles.buttonGroup}>
          <button className={styles.primaryBtn} onClick={() => setMode('create')}>
            Create Room
          </button>
          <button className={styles.secondaryBtn} onClick={() => setMode('join')}>
            Join Room
          </button>
        </div>

        <button className={styles.backBtn} onClick={onBack}>
          Back
        </button>

        {lobby.error && <p className={styles.error}>{lobby.error}</p>}
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className={styles.lobby}>
        <h2 className={styles.title}>Create Room</h2>

        <div className={styles.field}>
          <label className={styles.label}>Your Name</label>
          <input
            className={styles.input}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Timer</label>
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

        <button
          className={styles.primaryBtn}
          onClick={handleCreate}
          disabled={!playerName.trim() || lobby.phase === 'lobby'}
        >
          {lobby.phase === 'lobby' ? 'Creating...' : 'Create Room'}
        </button>

        <button className={styles.backBtn} onClick={() => setMode('menu')}>
          Back
        </button>

        {lobby.error && <p className={styles.error}>{lobby.error}</p>}
      </div>
    );
  }

  // join mode
  return (
    <div className={styles.lobby}>
      <h2 className={styles.title}>Join Room</h2>

      <div className={styles.field}>
        <label className={styles.label}>Your Name</label>
        <input
          className={styles.input}
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Room Code</label>
        <input
          className={styles.codeInput}
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
          maxLength={4}
        />
      </div>

      <button
        className={styles.primaryBtn}
        onClick={handleJoin}
        disabled={!playerName.trim() || roomCode.length !== 4 || lobby.phase === 'lobby'}
      >
        {lobby.phase === 'lobby' ? 'Joining...' : 'Join Room'}
      </button>

      <button className={styles.backBtn} onClick={() => setMode('menu')}>
        Back
      </button>

      {lobby.error && <p className={styles.error}>{lobby.error}</p>}
    </div>
  );
}

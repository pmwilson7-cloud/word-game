import { useState } from 'react';
import { useLobby } from '../../hooks/useLobby.ts';
import type { AIDifficulty } from '../../types/index.ts';
import styles from './Lobby.module.css';

export function WaitingRoom() {
  const lobby = useLobby();
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');

  const room = lobby.roomState;
  if (!room) return null;

  const isHost = lobby.playerId === room.hostId;
  const me = room.players.find(p => p.id === lobby.playerId);
  const canStart = isHost && room.players.length >= 2 &&
    room.players.filter(p => !p.isAI).every(p => p.isReady || p.id === room.hostId);

  return (
    <div className={styles.lobby}>
      <h2 className={styles.title}>Waiting Room</h2>

      <div className={styles.codeDisplay}>
        <label className={styles.label}>Room Code</label>
        <div className={styles.code}>{room.code}</div>
        <button
          className={styles.copyBtn}
          onClick={() => navigator.clipboard.writeText(room.code)}
        >
          Copy
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Players ({room.players.length}/{room.maxPlayers})</label>
        <div className={styles.playerList}>
          {room.players.map(player => (
            <div key={player.id} className={styles.playerItem}>
              <span className={styles.playerName}>
                {player.name}
                {player.id === room.hostId && <span className={styles.hostBadge}>Host</span>}
                {player.isAI && <span className={styles.aiBadge}>AI</span>}
                {!player.connected && <span className={styles.disconnectedBadge}>Offline</span>}
              </span>
              <span className={styles.readyStatus}>
                {player.isAI || player.id === room.hostId
                  ? 'Ready'
                  : player.isReady ? 'Ready' : 'Not ready'}
              </span>
              {isHost && player.id !== room.hostId && (
                <button
                  className={styles.removeBtn}
                  onClick={() => lobby.removePlayer(player.id)}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost && room.players.length < room.maxPlayers && (
        <div className={styles.addAI}>
          <select
            className={styles.difficultySelect}
            value={aiDifficulty}
            onChange={e => setAIDifficulty(e.target.value as AIDifficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            className={styles.secondaryBtn}
            onClick={() => lobby.addAI(aiDifficulty)}
          >
            + Add AI
          </button>
        </div>
      )}

      <div className={styles.buttonGroup}>
        {!isHost && me && (
          <button
            className={me.isReady ? styles.secondaryBtn : styles.primaryBtn}
            onClick={() => lobby.setReady(!me.isReady)}
          >
            {me.isReady ? 'Not Ready' : 'Ready'}
          </button>
        )}

        {isHost && (
          <button
            className={styles.primaryBtn}
            onClick={() => lobby.startGame()}
            disabled={!canStart}
          >
            Start Game
          </button>
        )}

        <button className={styles.backBtn} onClick={() => lobby.leaveRoom()}>
          Leave Room
        </button>
      </div>

      {lobby.error && <p className={styles.error}>{lobby.error}</p>}
    </div>
  );
}

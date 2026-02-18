import { useEffect, useRef } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { useTimerStore } from '../store/timerStore.ts';
import { connectSocket } from './useSocket.ts';
import type { ClientTimerState } from '../types/online.ts';

function syncTimerStore(timer: ClientTimerState): void {
  const ts = useTimerStore.getState();
  if (ts.mode !== timer.mode) {
    useTimerStore.setState({
      mode: timer.mode,
      turnTimeRemaining: timer.turnTimeRemaining,
      turnTimeTotal: timer.turnTimeTotal,
      playerTimes: timer.playerTimes,
      isRunning: true,
    });
  } else {
    useTimerStore.setState({
      turnTimeRemaining: timer.turnTimeRemaining,
      playerTimes: timer.playerTimes,
    });
  }
}

/**
 * Registers all socket event listeners once at the App level.
 * This hook should be called when mode === 'online' and stays mounted
 * across lobby/waiting/playing/ended phase transitions.
 */
export function useSocketListeners() {
  const attached = useRef(false);

  useEffect(() => {
    if (attached.current) return;
    attached.current = true;

    const socket = connectSocket();

    socket.on('room:state', (state) => {
      useOnlineStore.getState().setRoomState(state);
      const { phase } = useOnlineStore.getState();
      if (state.status === 'waiting' && (phase === 'lobby' || phase === 'idle')) {
        useOnlineStore.getState().setPhase('waiting');
      }
    });

    socket.on('game:state', (state) => {
      useOnlineStore.getState().applyGameState(state);
      syncTimerStore(state.timerState);
    });

    socket.on('game:timer', (timer) => {
      useOnlineStore.getState().updateTimer(timer);
      syncTimerStore(timer);
    });

    socket.on('game:error', (error) => {
      useOnlineStore.getState().setLastError(error);
    });

    socket.on('room:error', (error) => {
      useOnlineStore.getState().setError(error);
    });

    socket.on('room:closed', (reason) => {
      useOnlineStore.getState().setError(reason);
      useOnlineStore.getState().setPhase('idle');
    });

    socket.on('player:disconnected', (data) => {
      useOnlineStore.getState().setDisconnectedPlayer(data.name);
      setTimeout(() => {
        useOnlineStore.getState().setDisconnectedPlayer(null);
      }, 5000);
    });

    socket.on('player:reconnected', () => {
      useOnlineStore.getState().setDisconnectedPlayer(null);
    });

    socket.on('disconnect', () => {
      const { roomCode, playerId, phase } = useOnlineStore.getState();
      if (roomCode && playerId && (phase === 'playing' || phase === 'waiting')) {
        socket.once('connect', () => {
          socket.emit('room:rejoin', { roomCode, playerId }, (response) => {
            if (!response.ok) {
              useOnlineStore.getState().setError('Failed to reconnect to room');
              useOnlineStore.getState().setPhase('idle');
            }
          });
        });
      }
    });

    return () => {
      socket.removeAllListeners();
      attached.current = false;
    };
  }, []);
}

import { useCallback } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { connectSocket, disconnectSocket } from './useSocket.ts';
import type { TimerConfig, AIDifficulty } from '../types/index.ts';

export function useLobby() {
  const store = useOnlineStore();

  const createRoom = useCallback((playerName: string, timerConfig: TimerConfig) => {
    const socket = connectSocket();
    useOnlineStore.getState().setPhase('lobby');
    useOnlineStore.getState().setError(null);

    socket.emit('room:create', { playerName, timerConfig }, (response) => {
      if (response.ok) {
        useOnlineStore.getState().setRoom(response.roomCode, response.playerId);
        useOnlineStore.getState().setPhase('waiting');
        sessionStorage.setItem('wg-room', response.roomCode);
        sessionStorage.setItem('wg-player', response.playerId);
      } else {
        useOnlineStore.getState().setError(response.error);
        useOnlineStore.getState().setPhase('idle');
      }
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const socket = connectSocket();
    useOnlineStore.getState().setPhase('lobby');
    useOnlineStore.getState().setError(null);

    socket.emit('room:join', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
      if (response.ok) {
        useOnlineStore.getState().setRoom(roomCode.toUpperCase(), response.playerId);
        useOnlineStore.getState().setPhase('waiting');
        sessionStorage.setItem('wg-room', roomCode.toUpperCase());
        sessionStorage.setItem('wg-player', response.playerId);
      } else {
        useOnlineStore.getState().setError(response.error);
        useOnlineStore.getState().setPhase('idle');
      }
    });
  }, []);

  const rejoinRoom = useCallback(() => {
    const roomCode = sessionStorage.getItem('wg-room');
    const playerId = sessionStorage.getItem('wg-player');
    if (!roomCode || !playerId) return false;

    const socket = connectSocket();
    useOnlineStore.getState().setPhase('lobby');

    socket.emit('room:rejoin', { roomCode, playerId }, (response) => {
      if (response.ok) {
        useOnlineStore.getState().setRoom(roomCode, playerId);
      } else {
        sessionStorage.removeItem('wg-room');
        sessionStorage.removeItem('wg-player');
        useOnlineStore.getState().setPhase('idle');
      }
    });

    return true;
  }, []);

  const setReady = useCallback((ready: boolean) => {
    const socket = connectSocket();
    socket.emit('room:ready', { ready });
  }, []);

  const addAI = useCallback((difficulty: AIDifficulty) => {
    const socket = connectSocket();
    socket.emit('room:addAI', { difficulty }, (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setError(response.error);
      }
    });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    const socket = connectSocket();
    socket.emit('room:removePlayer', { playerId }, (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setError(response.error);
      }
    });
  }, []);

  const startGame = useCallback(() => {
    const socket = connectSocket();
    socket.emit('room:start', (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setError(response.error);
      }
    });
  }, []);

  const leaveRoom = useCallback(() => {
    disconnectSocket();
    sessionStorage.removeItem('wg-room');
    sessionStorage.removeItem('wg-player');
    useOnlineStore.getState().reset();
  }, []);

  return {
    ...store,
    createRoom,
    joinRoom,
    rejoinRoom,
    setReady,
    addAI,
    removePlayer,
    startGame,
    leaveRoom,
  };
}

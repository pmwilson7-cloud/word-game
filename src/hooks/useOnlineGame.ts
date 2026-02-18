import { useCallback } from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';
import { useTimerStore } from '../store/timerStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { connectSocket, disconnectSocket } from './useSocket.ts';
import type { Tile } from '../types/index.ts';

export function useOnlineGame() {
  const store = useOnlineStore();
  const ui = useUiStore();

  const commitMove = useCallback(() => {
    const { pendingPlacements } = useOnlineStore.getState();
    if (pendingPlacements.length === 0) {
      useOnlineStore.getState().setLastError('No tiles placed');
      return;
    }

    const blanks = pendingPlacements.filter(p => p.tile.isBlank && !p.tile.designatedLetter);
    if (blanks.length > 0) {
      ui.openBlankModal(blanks[0].tile.id);
      return;
    }

    const socket = connectSocket();
    socket.emit('game:commitMove', { placements: pendingPlacements }, (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setLastError(response.error);
      }
      // On success: don't recall tiles here — the server will send game:state
      // with the tiles baked into the board, which applyGameState handles
    });
  }, [ui]);

  const passTurn = useCallback(() => {
    useOnlineStore.getState().recallTiles();
    const socket = connectSocket();
    socket.emit('game:pass', (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setLastError(response.error);
      }
    });
  }, []);

  const exchangeTiles = useCallback((tiles: Tile[]) => {
    useOnlineStore.getState().recallTiles();
    const socket = connectSocket();
    socket.emit('game:exchange', { tileIds: tiles.map(t => t.id) }, (response) => {
      if (!response.ok) {
        useOnlineStore.getState().setLastError(response.error);
      }
    });
    ui.closeExchangeModal();
  }, [ui]);

  const setBlankLetter = useCallback((tileId: string, letter: string) => {
    useOnlineStore.getState().setBlankLetter(tileId, letter);
    const socket = connectSocket();
    socket.emit('game:setBlank', { tileId, letter });
  }, []);

  const exitGame = useCallback(() => {
    disconnectSocket();
    sessionStorage.removeItem('wg-room');
    sessionStorage.removeItem('wg-player');
    useOnlineStore.getState().reset();
    useTimerStore.getState().cleanup();
    ui.closeExitConfirm();
  }, [ui]);

  return {
    ...store,
    ui,
    commitMove,
    passTurn,
    exchangeTiles,
    setBlankLetter,
    exitGame,
  };
}

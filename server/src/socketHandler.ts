import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/types/socketEvents.ts';
import * as roomManager from './roomManager.ts';
import * as gameManager from './gameManager.ts';
import * as timerManager from './timerManager.ts';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Track which room each socket is in
const socketRooms = new Map<string, string>(); // socketId -> roomCode

function broadcastRoomState(io: IO, room: roomManager.Room): void {
  const state = roomManager.getRoomState(room);
  io.to(room.code).emit('room:state', state);
}

function broadcastGameState(io: IO, roomCode: string, room: roomManager.Room): void {
  for (const [playerId, socketId] of room.playerSockets) {
    const clientState = gameManager.getClientGameState(roomCode, playerId);
    if (clientState) {
      io.to(socketId).emit('game:state', clientState);
    }
  }
}

function scheduleAITurn(io: IO, roomCode: string, room: roomManager.Room): void {
  const game = gameManager.getGame(roomCode);
  if (!game || game.phase !== 'playing') return;

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer?.isAI) return;

  const difficulty = currentPlayer.aiDifficulty ?? 'medium';
  const delays: Record<string, [number, number]> = {
    easy: [800, 1500],
    medium: [1000, 2000],
    hard: [1500, 2500],
  };
  const [min, max] = delays[difficulty] ?? [1000, 2000];
  const delay = min + Math.random() * (max - min);

  setTimeout(() => {
    const currentGame = gameManager.getGame(roomCode);
    if (!currentGame || currentGame.phase !== 'playing') return;
    if (!currentGame.players[currentGame.currentPlayerIndex]?.isAI) return;

    gameManager.processAITurn(roomCode);

    const updatedGame = gameManager.getGame(roomCode);
    if (!updatedGame) return;

    if (updatedGame.phase === 'ended') {
      roomManager.setRoomStatus(roomCode, 'ended');
      timerManager.cleanupTimer(roomCode);
    } else {
      timerManager.onTurnChange(roomCode, updatedGame.currentPlayerIndex);
    }

    broadcastGameState(io, roomCode, room);

    // Chain AI turns
    if (updatedGame.phase === 'playing') {
      scheduleAITurn(io, roomCode, room);
    }
  }, delay);
}

export function registerSocketHandlers(io: IO, socket: ClientSocket): void {
  socket.on('room:create', (data, callback) => {
    const { room, playerId } = roomManager.createRoom(data.playerName, socket.id, data.timerConfig);
    socket.join(room.code);
    socketRooms.set(socket.id, room.code);
    callback({ ok: true, roomCode: room.code, playerId });
    broadcastRoomState(io, room);
  });

  socket.on('room:join', (data, callback) => {
    const result = roomManager.joinRoom(data.roomCode, data.playerName, socket.id);
    if ('error' in result) {
      callback({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.code);
    socketRooms.set(socket.id, result.room.code);
    callback({ ok: true, playerId: result.playerId });
    broadcastRoomState(io, result.room);
  });

  socket.on('room:rejoin', (data, callback) => {
    const result = roomManager.rejoinRoom(data.roomCode, data.playerId, socket.id);
    if ('error' in result) {
      callback({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.code);
    socketRooms.set(socket.id, result.room.code);
    callback({ ok: true });

    broadcastRoomState(io, result.room);

    // If game is in progress, send current game state
    const clientState = gameManager.getClientGameState(data.roomCode, data.playerId);
    if (clientState) {
      socket.emit('game:state', clientState);
    }

    io.to(result.room.code).emit('player:reconnected', {
      playerId: data.playerId,
      name: result.room.players.find(p => p.id === data.playerId)?.name ?? 'Unknown',
    });
  });

  socket.on('room:ready', (data) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) return;
    const room = roomManager.setReady(found.room.code, found.playerId, data.ready);
    if (room) broadcastRoomState(io, room);
  });

  socket.on('room:addAI', (data, callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }
    const result = roomManager.addAIPlayer(found.room.code, found.playerId, data.difficulty);
    if ('error' in result) {
      callback({ ok: false, error: result.error });
      return;
    }
    callback({ ok: true });
    broadcastRoomState(io, result.room);
  });

  socket.on('room:removePlayer', (data, callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }
    const result = roomManager.removePlayer(found.room.code, found.playerId, data.playerId);
    if ('error' in result) {
      callback({ ok: false, error: result.error });
      return;
    }
    callback({ ok: true });

    // If removed player has a socket, notify them and remove from socket room
    const removedSocketId = found.room.playerSockets.get(data.playerId);
    if (removedSocketId) {
      io.to(removedSocketId).emit('room:closed', 'You were removed from the room');
      const removedSocket = io.sockets.sockets.get(removedSocketId);
      if (removedSocket) {
        removedSocket.leave(found.room.code);
        socketRooms.delete(removedSocketId);
      }
    }

    broadcastRoomState(io, result.room);
  });

  socket.on('room:start', (callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }
    if (found.room.hostId !== found.playerId) {
      callback({ ok: false, error: 'Only host can start the game' });
      return;
    }
    if (!roomManager.canStartGame(found.room)) {
      callback({ ok: false, error: 'Not all players are ready' });
      return;
    }

    const { room } = found;
    roomManager.setRoomStatus(room.code, 'playing');

    const gameState = gameManager.startGame(room.code, room.players, room.timerConfig);

    // Set up timer
    if (room.timerConfig.mode !== 'none') {
      timerManager.createTimer(
        room.code,
        room.timerConfig,
        room.players.length,
        (timerState) => {
          // Broadcast timer ticks to all players
          for (const [pid, sid] of room.playerSockets) {
            if (pid) io.to(sid).emit('game:timer', timerState);
          }
        },
        () => {
          // Timer expired — auto-pass
          const game = gameManager.getGame(room.code);
          if (!game || game.phase !== 'playing') return;
          const currentPlayer = game.players[game.currentPlayerIndex];
          gameManager.passTurn(room.code, currentPlayer.id);

          const updatedGame = gameManager.getGame(room.code);
          if (!updatedGame) return;

          if (updatedGame.phase === 'ended') {
            roomManager.setRoomStatus(room.code, 'ended');
            timerManager.cleanupTimer(room.code);
          } else {
            timerManager.onTurnChange(room.code, updatedGame.currentPlayerIndex);
          }

          broadcastGameState(io, room.code, room);
          if (updatedGame.phase === 'playing') {
            scheduleAITurn(io, room.code, room);
          }
        }
      );
      timerManager.startTimer(room.code, 0);
    }

    callback({ ok: true });
    broadcastGameState(io, room.code, room);

    // If first player is AI, schedule their turn
    if (gameState.players[0]?.isAI) {
      scheduleAITurn(io, room.code, room);
    }
  });

  socket.on('game:commitMove', (data, callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }

    const result = gameManager.commitMove(found.room.code, found.playerId, data.placements);
    if (!result.ok) {
      callback(result);
      return;
    }

    callback({ ok: true });
    handlePostMove(io, found.room);
  });

  socket.on('game:pass', (callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }

    const result = gameManager.passTurn(found.room.code, found.playerId);
    if (!result.ok) {
      callback(result);
      return;
    }

    callback({ ok: true });
    handlePostMove(io, found.room);
  });

  socket.on('game:exchange', (data, callback) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }

    const result = gameManager.exchangeTiles(found.room.code, found.playerId, data.tileIds);
    if (!result.ok) {
      callback(result);
      return;
    }

    callback({ ok: true });
    handlePostMove(io, found.room);
  });

  socket.on('game:setBlank', (data) => {
    const found = roomManager.getPlayerRoom(socket.id);
    if (!found) return;
    gameManager.setBlankLetter(found.room.code, found.playerId, data.tileId, data.letter);
  });

  socket.on('disconnect', () => {
    const found = roomManager.disconnectPlayer(socket.id);
    socketRooms.delete(socket.id);

    if (!found) return;
    const { room, playerId } = found;

    io.to(room.code).emit('player:disconnected', {
      playerId,
      name: room.players.find(p => p.id === playerId)?.name ?? 'Unknown',
    });

    broadcastRoomState(io, room);

    // If it's the disconnected player's turn during a game, set a timeout to auto-pass
    const game = gameManager.getGame(room.code);
    if (game && game.phase === 'playing') {
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer && currentPlayer.id === playerId) {
        setTimeout(() => {
          const currentGame = gameManager.getGame(room.code);
          if (!currentGame || currentGame.phase !== 'playing') return;
          if (currentGame.players[currentGame.currentPlayerIndex]?.id !== playerId) return;

          // Check if still disconnected
          const player = room.players.find(p => p.id === playerId);
          if (player && !player.connected) {
            gameManager.passTurn(room.code, playerId);
            handlePostMove(io, room);
          }
        }, 30_000); // 30 second grace period
      }
    }
  });
}

function handlePostMove(io: IO, room: roomManager.Room): void {
  const game = gameManager.getGame(room.code);
  if (!game) return;

  if (game.phase === 'ended') {
    roomManager.setRoomStatus(room.code, 'ended');
    timerManager.cleanupTimer(room.code);
  } else {
    timerManager.onTurnChange(room.code, game.currentPlayerIndex);
  }

  broadcastGameState(io, room.code, room);

  if (game.phase === 'playing') {
    scheduleAITurn(io, room.code, room);
  }
}

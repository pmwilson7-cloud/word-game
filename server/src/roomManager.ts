import type { TimerConfig, AIDifficulty } from '../../src/types/index.ts';
import type { RoomState, RoomPlayer, RoomStatus } from '../../src/types/online.ts';
import { randomUUID } from 'node:crypto';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const WAITING_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const ENDED_EXPIRY_MS = 30 * 60 * 1000; // 30 min

export interface Room {
  code: string;
  status: RoomStatus;
  players: RoomPlayer[];
  hostId: string;
  timerConfig: TimerConfig;
  maxPlayers: number;
  createdAt: number;
  endedAt: number | null;
  // Maps playerId -> socketId for connection tracking
  playerSockets: Map<string, string>;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostName: string, socketId: string, timerConfig: TimerConfig): { room: Room; playerId: string } {
  const code = generateCode();
  const playerId = randomUUID();

  const hostPlayer: RoomPlayer = {
    id: playerId,
    name: hostName,
    isReady: false,
    isHost: true,
    isAI: false,
    connected: true,
  };

  const room: Room = {
    code,
    status: 'waiting',
    players: [hostPlayer],
    hostId: playerId,
    timerConfig,
    maxPlayers: 4,
    createdAt: Date.now(),
    endedAt: null,
    playerSockets: new Map([[playerId, socketId]]),
  };

  rooms.set(code, room);
  return { room, playerId };
}

export function joinRoom(code: string, playerName: string, socketId: string): { room: Room; playerId: string } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'waiting') return { error: 'Game already in progress' };
  if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };

  const playerId = randomUUID();
  const player: RoomPlayer = {
    id: playerId,
    name: playerName,
    isReady: false,
    isHost: false,
    isAI: false,
    connected: true,
  };

  room.players.push(player);
  room.playerSockets.set(playerId, socketId);
  return { room, playerId };
}

export function rejoinRoom(code: string, playerId: string, socketId: string): { room: Room } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found in room' };

  player.connected = true;
  room.playerSockets.set(playerId, socketId);
  return { room };
}

export function addAIPlayer(code: string, requesterId: string, difficulty: AIDifficulty): { room: Room } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.hostId !== requesterId) return { error: 'Only host can add AI players' };
  if (room.status !== 'waiting') return { error: 'Game already in progress' };
  if (room.players.length >= room.maxPlayers) return { error: 'Room is full' };

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const aiPlayer: RoomPlayer = {
    id: randomUUID(),
    name: `CPU (${diffLabel})`,
    isReady: true,
    isHost: false,
    isAI: true,
    aiDifficulty: difficulty,
    connected: true,
  };

  room.players.push(aiPlayer);
  return { room };
}

export function removePlayer(code: string, requesterId: string, targetId: string): { room: Room } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.hostId !== requesterId) return { error: 'Only host can remove players' };
  if (targetId === requesterId) return { error: 'Cannot remove yourself' };
  if (room.status !== 'waiting') return { error: 'Game already in progress' };

  room.players = room.players.filter(p => p.id !== targetId);
  room.playerSockets.delete(targetId);
  return { room };
}

export function setReady(code: string, playerId: string, ready: boolean): Room | null {
  const room = rooms.get(code);
  if (!room) return null;

  const player = room.players.find(p => p.id === playerId);
  if (player) player.isReady = ready;

  return room;
}

export function setRoomStatus(code: string, status: RoomStatus): void {
  const room = rooms.get(code);
  if (!room) return;
  room.status = status;
  if (status === 'ended') room.endedAt = Date.now();
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getPlayerRoom(socketId: string): { room: Room; playerId: string } | undefined {
  for (const room of rooms.values()) {
    for (const [playerId, sid] of room.playerSockets) {
      if (sid === socketId) return { room, playerId };
    }
  }
  return undefined;
}

export function disconnectPlayer(socketId: string): { room: Room; playerId: string } | undefined {
  const found = getPlayerRoom(socketId);
  if (!found) return undefined;

  const { room, playerId } = found;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.connected = false;
  room.playerSockets.delete(playerId);

  return found;
}

export function getRoomState(room: Room): RoomState {
  return {
    code: room.code,
    status: room.status,
    players: room.players,
    hostId: room.hostId,
    timerConfig: room.timerConfig,
    maxPlayers: room.maxPlayers,
  };
}

export function canStartGame(room: Room): boolean {
  if (room.status !== 'waiting') return false;
  const humanPlayers = room.players.filter(p => !p.isAI);
  if (humanPlayers.length === 0) return false;
  if (room.players.length < 2) return false;
  return humanPlayers.every(p => p.isReady || p.isHost);
}

// Cleanup expired rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.status === 'waiting' && now - room.createdAt > WAITING_EXPIRY_MS) {
      rooms.delete(code);
    } else if (room.status === 'ended' && room.endedAt && now - room.endedAt > ENDED_EXPIRY_MS) {
      rooms.delete(code);
    }
  }
}, 60_000);

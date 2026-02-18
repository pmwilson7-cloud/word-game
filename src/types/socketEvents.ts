import type { PlacedTile, TimerConfig, AIDifficulty } from './index.ts';
import type { ClientGameState, RoomState, ClientTimerState } from './online.ts';

// Client -> Server events
export interface ClientToServerEvents {
  'room:create': (data: {
    playerName: string;
    timerConfig: TimerConfig;
  }, callback: (response: { ok: true; roomCode: string; playerId: string } | { ok: false; error: string }) => void) => void;

  'room:join': (data: {
    roomCode: string;
    playerName: string;
  }, callback: (response: { ok: true; playerId: string } | { ok: false; error: string }) => void) => void;

  'room:rejoin': (data: {
    roomCode: string;
    playerId: string;
  }, callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'room:ready': (data: { ready: boolean }) => void;

  'room:addAI': (data: {
    difficulty: AIDifficulty;
  }, callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'room:removePlayer': (data: {
    playerId: string;
  }, callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'room:start': (callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'game:commitMove': (data: {
    placements: PlacedTile[];
  }, callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'game:pass': (callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'game:exchange': (data: {
    tileIds: string[];
  }, callback: (response: { ok: true } | { ok: false; error: string }) => void) => void;

  'game:setBlank': (data: {
    tileId: string;
    letter: string;
  }) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:error': (error: string) => void;
  'room:closed': (reason: string) => void;

  'game:state': (state: ClientGameState) => void;
  'game:timer': (timer: ClientTimerState) => void;
  'game:error': (error: string) => void;

  'player:disconnected': (data: { playerId: string; name: string }) => void;
  'player:reconnected': (data: { playerId: string; name: string }) => void;
}

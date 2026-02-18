import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { loadServerDictionary } from './serverDictionary.ts';
import { registerSocketHandlers } from './socketHandler.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/types/socketEvents.ts';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const corsOrigins = CORS_ORIGIN.split(',').map(o => o.trim());

// Load dictionary at startup
loadServerDictionary();

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

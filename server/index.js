import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRouter, { createInitialAdmin } from './auth.js';

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = express();
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'chatworld-server',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e6,
});

const ROOM = 'public-lobby';
const history = [];
const MAX_HISTORY = 100;
const users = new Map();
const nicknamePattern = /^[\p{L}\p{N}_ -]{2,24}$/u;

function publicUsers() {
  return [...users.entries()].map(([id, nickname]) => ({ id, nickname }));
}

io.on('connection', (socket) => {
  socket.on('room:join', (payload = {}) => {
    const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim().replace(/\s+/g, ' ') : '';
    if (!nicknamePattern.test(nickname)) {
      socket.emit('chat:error', 'Choose a nickname between 2 and 24 characters.');
      return;
    }
    const taken = [...users.values()].some((name) => name.toLocaleLowerCase() === nickname.toLocaleLowerCase());
    if (taken) {
      socket.emit('chat:error', 'That nickname is already in use. Please choose another.');
      return;
    }
    users.set(socket.id, nickname);
    socket.join(ROOM);
    socket.emit('chat:history', history);
    io.to(ROOM).emit('users:update', publicUsers());
    const joined = { id: `system-${Date.now()}-${socket.id}`, nickname: 'ChatWorld', text: `${nickname} joined the lobby.`, createdAt: new Date().toISOString(), system: true };
    history.push(joined);
    if (history.length > MAX_HISTORY) history.shift();
    io.to(ROOM).emit('chat:message', joined);
  });

  socket.on('chat:send', (payload = {}) => {
    const nickname = users.get(socket.id);
    if (!nickname) {
      socket.emit('chat:error', 'Join the room before sending messages.');
      return;
    }
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text || text.length > 500) return;
    const message = { id: `${Date.now()}-${socket.id}-${Math.random().toString(36).slice(2, 8)}`, socketId: socket.id, nickname, text, createdAt: new Date().toISOString() };
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    io.to(ROOM).emit('chat:message', message);
  });

  socket.on('disconnect', () => {
    const nickname = users.get(socket.id);
    if (!nickname) return;
    users.delete(socket.id);
    io.to(ROOM).emit('users:update', publicUsers());
    const message = { id: `system-${Date.now()}-${socket.id}`, nickname: 'ChatWorld', text: `${nickname} left the lobby.`, createdAt: new Date().toISOString(), system: true };
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    io.to(ROOM).emit('chat:message', message);
  });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    await createInitialAdmin();
    httpServer.listen(PORT, () => console.log(`ChatWorld server listening on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Unable to start ChatWorld server:', error.message);
    process.exit(1);
  }
}
start();

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ message: 'Username or email already exists.' });
  if (error?.name === 'MulterError') return res.status(400).json({ message: 'Avatar upload failed or file is too large.' });
  res.status(500).json({ message: 'Unexpected server error.' });
});

import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'chatworld-server' }));

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
      socket.disconnect(true);
      return;
    }

    // Avoid duplicate visible nicknames in this simple guest room.
    const taken = [...users.values()].some((name) => name.toLocaleLowerCase() === nickname.toLocaleLowerCase());
    if (taken) {
      socket.emit('chat:error', 'That nickname is already in use. Please choose another.');
      socket.disconnect(true);
      return;
    }

    users.set(socket.id, nickname);
    socket.join(ROOM);
    socket.emit('chat:history', history);
    io.to(ROOM).emit('users:update', publicUsers());

    const joined = {
      id: `system-${Date.now()}-${socket.id}`,
      nickname: 'ChatWorld',
      text: `${nickname} joined the lobby.`,
      createdAt: new Date().toISOString(),
      system: true,
    };
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
    const message = {
      id: `${Date.now()}-${socket.id}-${Math.random().toString(36).slice(2, 8)}`,
      socketId: socket.id,
      nickname,
      text,
      createdAt: new Date().toISOString(),
    };
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    io.to(ROOM).emit('chat:message', message);
  });

  socket.on('disconnect', () => {
    const nickname = users.get(socket.id);
    if (!nickname) return;
    users.delete(socket.id);
    io.to(ROOM).emit('users:update', publicUsers());
    const message = {
      id: `system-${Date.now()}-${socket.id}`,
      nickname: 'ChatWorld',
      text: `${nickname} left the lobby.`,
      createdAt: new Date().toISOString(),
      system: true,
    };
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    io.to(ROOM).emit('chat:message', message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`ChatWorld server listening on http://localhost:${PORT}`);
});

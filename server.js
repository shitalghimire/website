import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Turbo Race Multiplayer Game State
const rooms = {};
const socketRoomMap = {};

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const COLORS = [
  { name: 'Red', value: 'hsl(0, 70%, 50%)' },
  { name: 'Blue', value: 'hsl(210, 70%, 50%)' },
  { name: 'Green', value: 'hsl(120, 70%, 50%)' },
  { name: 'Yellow', value: 'hsl(60, 70%, 50%)' },
  { name: 'Purple', value: 'hsl(280, 70%, 50%)' },
  { name: 'Orange', value: 'hsl(30, 70%, 50%)' },
  { name: 'Cyan', value: 'hsl(180, 70%, 50%)' },
  { name: 'Pink', value: 'hsl(330, 70%, 50%)' },
];

const createPlayer = (id, colorInfo) => ({
  id,
  x: 650 + (Math.random() * 40 - 20),
  y: 750 + (Math.random() * 20 - 10),
  angle: Math.PI,
  color: colorInfo.value,
  name: colorInfo.name,
  speed: 0,
  laps: 0,
  bestLapTime: Infinity,
  lastLapStart: Date.now(),
  nitro: 100,
  drifting: false,
});

io.on('connection', (socket) => {
  // Room Management
  socket.on('createRoom', () => {
    const roomId = generateRoomCode();
    const colorInfo = COLORS[0];
    const newPlayer = createPlayer(socket.id, colorInfo);

    rooms[roomId] = {
      id: roomId,
      players: { [socket.id]: newPlayer },
      status: 'waiting',
      hostId: socket.id
    };

    socketRoomMap[socket.id] = roomId;
    socket.join(roomId);

    socket.emit('roomCreated', { roomId, players: rooms[roomId].players, isHost: true });
  });

  socket.on('joinRoom', ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].status === 'waiting') {
      const room = rooms[roomId];
      const usedColors = Object.values(room.players).map(p => p.name);
      const availableColor = COLORS.find(c => !usedColors.includes(c.name)) || COLORS[Math.floor(Math.random() * COLORS.length)];

      const newPlayer = createPlayer(socket.id, availableColor);

      room.players[socket.id] = newPlayer;
      socketRoomMap[socket.id] = roomId;
      socket.join(roomId);

      socket.emit('roomJoined', { roomId, players: room.players, isHost: false });
      socket.to(roomId).emit('playerJoinedRoom', newPlayer);
    } else {
      socket.emit('error', 'Room not found or game already started');
    }
  });

  socket.on('startGame', () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
      rooms[roomId].status = 'racing';
      io.to(roomId).emit('gameStarted', rooms[roomId].players);
    }
  });

  // Game Events
  socket.on('playerMovement', (movementData) => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      const player = rooms[roomId].players[socket.id];
      if (player) {
        player.x = movementData.x;
        player.y = movementData.y;
        player.angle = movementData.angle;
        player.speed = movementData.speed;
        player.nitro = movementData.nitro;
        player.drifting = movementData.drifting;

        socket.to(roomId).emit('playerMoved', player);
      }
    }
  });

  socket.on('lapFinished', (lapTime) => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      const player = rooms[roomId].players[socket.id];
      if (player) {
        player.laps += 1;
        if (lapTime < player.bestLapTime) {
          player.bestLapTime = lapTime;
        }
        player.lastLapStart = Date.now();
        io.to(roomId).emit('lapUpdate', { id: player.id, laps: player.laps, bestLapTime: player.bestLapTime });
      }
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      delete rooms[roomId].players[socket.id];
      delete socketRoomMap[socket.id];

      io.to(roomId).emit('playerDisconnected', socket.id);

      if (Object.keys(rooms[roomId].players).length === 0) {
        delete rooms[roomId];
      } else if (rooms[roomId].hostId === socket.id) {
        const newHostId = Object.keys(rooms[roomId].players)[0];
        rooms[roomId].hostId = newHostId;
        io.to(roomId).emit('hostMigrated', newHostId);
      }
    }
  });
});

// Dedicated route for Turbo Race built app
app.use('/games/turbo-race', express.static(join(__dirname, 'games', 'turbo-race'), {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Route alias for turbo-race-multiplayer path
app.use('/games/turbo-race-multiplayer', express.static(join(__dirname, 'games', 'turbo-race'), {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Serve all static files from repository root (portfolio, arcade, typing, courses)
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

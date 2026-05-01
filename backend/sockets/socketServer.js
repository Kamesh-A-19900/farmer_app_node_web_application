const { verifyToken } = require('../utils/jwt');
const { handleChatEvents } = require('./chatSocket');
const { handleCallEvents } = require('./callSocket');

const activeUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // JWT auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    activeUsers.set(userId, socket.id);
    io.emit('user_connected', { userId });
    console.log(`Socket connected: user ${userId}`);

    handleChatEvents(socket, io, activeUsers);
    handleCallEvents(socket, io, activeUsers);

    socket.on('disconnect', () => {
      activeUsers.delete(userId);
      io.emit('user_disconnected', { userId });
      console.log(`Socket disconnected: user ${userId}`);
    });
  });
};

module.exports = { initSocket, activeUsers };

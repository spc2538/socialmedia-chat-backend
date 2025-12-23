const chatSocket = require('./chat.socket');
const chatService = require('../services/chat.service');

const userSockets = new Map();

module.exports = (io) => {
  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    console.log('User connected:', socket.id, 'user:', userId);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    const messages = await chatService.getRecentMessages(50);
    socket.emit('chat:history', messages);

    chatSocket(io, socket);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });
};

module.exports.userSockets = userSockets;

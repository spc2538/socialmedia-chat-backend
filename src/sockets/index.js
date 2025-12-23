const chatSocket = require('./chat.socket');

const userSockets = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user.id;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log('User connected:', socket.id, 'user:', socket.user.id);
    chatSocket(io, socket);
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        console.log("Deleted socket: " + socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          console.log("Deleted user sockets id: " + userId);
        }
      }
    });
  });
};

module.exports.userSockets = userSockets;

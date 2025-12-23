const chatService = require('../services/chat.service');

module.exports = (io, socket) => {
  socket.on('chat:join', async ({ roomId }) => {
    try {
      const hasAccess = await chatService.isMember(
        roomId,
        socket.user.id
      );


      if (!hasAccess) {

        console.log("User:: ");
        console.log(socket.user);
        return socket.emit('chat:error', { message: 'Access denied' });
      }

      socket.join(`room:${roomId}`);
      const messages = await chatService.getRoomMessages(roomId, 50);

      socket.emit('chat:history', {
        roomId,
        messages
      });
    } catch (err) {
      console.error(err);
      socket.emit('chat:error', { message: 'Failed to join room' });
    }
  });

  socket.on('chat:leave', ({ roomId }) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on('chat:message', async ({ roomId, message }) => {
    if (!roomId || !message?.trim()) return;

    const hasAccess = await chatService.isMember(
      roomId,
      socket.user.id,
    );

    if (!hasAccess) {
      return socket.emit('chat:error', { message: 'Access denied' });
    }

    const saved = await chatService.saveMessage(
      roomId,
      socket.user.id,
      message
    );

    io.to(`room:${roomId}`).emit('chat:message', {
      id: saved.id,
      user: socket.user.email,
      message: saved.content,
      timestamp: saved.created_at,
      roomId,
      role: socket.user.role
    });
  });
};

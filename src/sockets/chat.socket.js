const chatService = require('../services/chat.service');

module.exports = (io, socket) => {
    socket.on('chat:message', async ({ message }) => {
        try {
            const saved = await chatService.saveMessage(
                socket.user.id,
                message
            );

            io.emit('chat:message', {
                id: saved.id,
                user: socket.user.email,
                message: saved.content,
                timestamp: saved.created_at,
            });

        } catch (err) {
            console.error('Chat message error:', err);
            socket.emit('chat:error', { message: 'Message not sent' });
        }
    });
};

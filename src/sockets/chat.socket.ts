import { Server, Socket } from 'socket.io';
import * as chatService from '../services/chat.service';

interface JoinRoomPayload {
  roomId: string;
}

interface ChatMessagePayload {
  roomId: string;
  message: string;
}

const chatSocket = (io: Server, socket: Socket): void => {
  socket.on('chat:join', async ({ roomId }: JoinRoomPayload) => {
    try {
      const hasAccess = await chatService.isMember(
        roomId,
        socket.user.id
      );

      if (!hasAccess) {
        console.log('User::', socket.user);
        socket.emit('chat:error', { message: 'Access denied' });
        return;
      }

      socket.join(`room:${roomId}`);

      const messages = await chatService.getRoomMessages(roomId, 50);

      socket.emit('chat:history', {
        roomId,
        messages,
      });
    } catch (err) {
      console.error(err);
      socket.emit('chat:error', { message: 'Failed to join room' });
    }
  });

  socket.on('chat:leave', ({ roomId }: JoinRoomPayload) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on('chat:message', async ({ roomId, message }: ChatMessagePayload) => {
    if (!roomId || !message?.trim()) return;

    const hasAccess = await chatService.isMember(
      roomId,
      socket.user.id
    );

    if (!hasAccess) {
      socket.emit('chat:error', { message: 'Access denied' });
      return;
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
      role: socket.user.role,
    });
  });
};

export default chatSocket;

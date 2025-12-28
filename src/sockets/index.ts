import { Server, Socket } from 'socket.io';
import chatSocket from './chat.socket';

type UserId = string;
type SocketId = string;

const userSockets: Map<UserId, Set<SocketId>> = new Map();

const socketHandler = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    const userId = socket.user.id;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }

    userSockets.get(userId)!.add(socket.id);

    console.log('User connected:', socket.id, 'user:', userId);

    chatSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      const sockets = userSockets.get(userId);

      if (!sockets) return;

      sockets.delete(socket.id);
      console.log('Deleted socket:', socket.id);

      if (sockets.size === 0) {
        userSockets.delete(userId);
        console.log('Deleted user sockets id:', userId);
      }
    });
  });
};

export default socketHandler;
export { userSockets };

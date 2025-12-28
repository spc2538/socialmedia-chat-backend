import { Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import redisClient from '../../infraestructure/redis';

interface AuthPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
      async (err, decoded) => {
        if (err || !decoded) {
          return next(new Error('Invalid or expired token'));
        }

        const isWhitelisted = await redisClient.exists(`at:${token}`);

        if (!isWhitelisted) {
          return next(new Error('Token revoked'));
        }

        socket.user = decoded as AuthPayload;
        socket.token = token;

        next();
      }
    );
  } catch (err) {
    next(new Error('Socket authentication failed'));
  }
};

export default socketAuthMiddleware;

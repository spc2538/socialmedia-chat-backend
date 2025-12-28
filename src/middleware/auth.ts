import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload as JwtLibPayload } from 'jsonwebtoken';
import redisClient from '../infraestructure/redis';
import dotenv from 'dotenv';

dotenv.config();

interface AuthJwtPayload extends JwtLibPayload {
  id: number;
  email: string;
  role: string;
}

const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET as string,
    async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(403)
          .json({ message: 'Invalid or expired token.' });
      }

      try {
        const isWhitelisted = await redisClient.exists(`at:${token}`);
        if (!isWhitelisted) {
          return res
            .status(403)
            .json({ message: 'Token is invalidated (logged out).' });
        }
      } catch (redisError) {
        console.error('Redis check failed:', redisError);
        return res
          .status(500)
          .json({ message: 'Authentication server error.' });
      }

      const payload = decoded as AuthJwtPayload;

      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role
      };

      return next();
    }
  );
};

export default authenticateToken;

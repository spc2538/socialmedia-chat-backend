
import { Request, Response } from 'express';
import pool from '../infraestructure/database';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload as JwtLibPayload, SignOptions } from 'jsonwebtoken';
import redisClient from '../infraestructure/redis';
import dotenv from 'dotenv';

dotenv.config();


interface DbUser {
  id: number;
  email: string;
  password: string;
  role: string;
  allowed: boolean;
}

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

interface RegisterBody {
  name: string;
  lastname: string;
  birthdate: string;
  phone_number?: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface TokenBody {
  refreshToken: string;
}

const accessTokenOptions: SignOptions = {
  expiresIn: process.env.ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: process.env.REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'],
};


const generateTokens = async (user: JwtPayload) => {
  const accessToken = jwt.sign(
    user,
    process.env.ACCESS_TOKEN_SECRET as string,
    accessTokenOptions
  );

  const refreshToken = jwt.sign(
    user,
    process.env.REFRESH_TOKEN_SECRET as string,
    refreshTokenOptions
  );

  const accessTtl = Number(process.env.ACCESS_TOKEN_EXPIRY_SECONDS ?? 300);
  const refreshTtl = Number(process.env.REFRESH_TOKEN_EXPIRY_SECONDS ?? 604800);

  await redisClient.set(`at:${accessToken}`, user.id.toString(), 'EX', accessTtl);
  await redisClient.set(`rt:${refreshToken}`, user.id.toString(), 'EX', refreshTtl);

  return { accessToken, refreshToken };
};


export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response
) => {
  const { name, lastname, birthdate, phone_number, email, password } = req.body;

  if (!name || !lastname || !email || !password || !birthdate) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 6 characters long.' });
  }

  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) {
    return res.status(400).json({ message: 'Invalid birthdate format.' });
  }

  const age = new Date().getFullYear() - birth.getFullYear();
  if (age < 18) {
    return res
      .status(400)
      .json({ message: 'User must be at least 18 years old.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO accounts
       (name, lastname, birthdate, phone_number, email, password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, lastname, birthdate, phone_number, email, hashedPassword]
    );

    return res.status(201).json({ message: 'Account created successfully.' });
  } catch (err: unknown) {
    if (err instanceof Error && (err as any).code === '23505') {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error during registration.' });
  }
};


export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const { rows } = await pool.query<DbUser>(
      'SELECT * FROM accounts WHERE email = $1',
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.allowed) {
      return res.status(403).json({ message: 'Account is banned.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

export const token = async (
  req: Request<{}, {}, TokenBody>,
  res: Response
) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  try {
    const userIdStr = await redisClient.get(`rt:${refreshToken}`);
    if (!userIdStr) {
      return res
        .status(403)
        .json({ message: 'Refresh token invalid or expired.' });
    }

    const userId = Number(userIdStr);

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
      async (err, decoded) => {
        if (err || !decoded) {
          await redisClient.del(`rt:${refreshToken}`);
          await redisClient.srem(`user:rt:${userId}`, refreshToken);
          return res.status(403).json({ message: 'Refresh token invalid.' });
        }

        const payload = decoded as JwtLibPayload & JwtPayload;

        await redisClient.del(`rt:${refreshToken}`);
        await redisClient.srem(`user:rt:${userId}`, refreshToken);

        const tokens = await generateTokens({
          id: userId,
          email: payload.email,
          role: payload.role
        });

        return res.json(tokens);
      }
    );
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error during token refresh.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const userId: number = req.user.id;

    const accessTokens: string[] =
      await redisClient.smembers(`user:at:${userId}`);

    const refreshTokens: string[] =
      await redisClient.smembers(`user:rt:${userId}`);

    if (accessTokens.length > 0) {
      await redisClient.del(
        ...accessTokens.map((token) => `at:${token}`)
      );
    }

    if (refreshTokens.length > 0) {
      await redisClient.del(
        ...refreshTokens.map((token) => `rt:${token}`)
      );
    }

    await redisClient.del(`user:at:${userId}`);
    await redisClient.del(`user:rt:${userId}`);

    res.json({ message: 'Logged out successfully.' });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Logout failed.' });
  }
};

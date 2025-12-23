const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redisClient = require('../redisClient');
const { userSockets } = require('../sockets');

require('dotenv').config();
const generateTokens = async (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const accessToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    const accessTtl = parseInt(process.env.ACCESS_TOKEN_EXPIRY_SECONDS || 300);
    const refreshTtl = parseInt(process.env.REFRESH_TOKEN_EXPIRY_SECONDS || 604800);

    await redisClient.set(`at:${accessToken}`, user.id, 'EX', accessTtl);
    await redisClient.set(`rt:${refreshToken}`, user.id, 'EX', refreshTtl);

    await redisClient.sadd(`user:at:${user.id}`, accessToken);
    await redisClient.sadd(`user:rt:${user.id}`, refreshToken);

    await redisClient.expire(`user:at:${user.id}`, refreshTtl);
    await redisClient.expire(`user:rt:${user.id}`, refreshTtl);

    return { accessToken, refreshToken };
};


exports.register = async (req, res) => {
    const { name, lastname, birthdate, phone_number, email, password } = req.body;
    if (!name || !lastname || !email || !password || !birthdate) {
        return res.status(400).json({ message: "Missing required fields." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) {
        return res.status(400).json({ message: "Invalid birthdate format." });
    }
    const age = new Date().getFullYear() - birth.getFullYear();
    if (age < 18) {
        return res.status(400).json({ message: "User must be at least 18 years old." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO accounts
             (name, lastname, birthdate, phone_number, email, password)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [name, lastname, birthdate, phone_number, email, hashedPassword]
        );

        res.status(201).json({ message: "Account created successfully." });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ message: "Email already in use." });
        }
        console.error(err);
        res.status(500).json({ message: "Server error during registration." });
    }
};



exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const { rows } = await pool.query(
            "SELECT * FROM accounts WHERE email = $1",
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

        const { accessToken, refreshToken } = await generateTokens(user);

        res.json({ accessToken, refreshToken });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login.' });
    }
};


exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;

        const accessTokens = await redisClient.smembers(`user:at:${userId}`);
        const refreshTokens = await redisClient.smembers(`user:rt:${userId}`);

        if (accessTokens.length) {
            await redisClient.del(...accessTokens.map(t => `at:${t}`));
        }

        if (refreshTokens.length) {
            await redisClient.del(...refreshTokens.map(t => `rt:${t}`));
        }

        await redisClient.del(`user:at:${userId}`);
        await redisClient.del(`user:rt:${userId}`);

        const sockets = userSockets.get(userId);
        if (sockets) {
            for (const socketId of sockets) {
                const socket = req.app.get('io').sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                }
            }
            userSockets.delete(userId);
        }

        res.json({ message: 'Logged out successfully.' });

    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: 'Logout failed.' });
    }
};




exports.token = async (req, res) => {
    const oldRefreshToken = req.body.refreshToken;
    if (!oldRefreshToken) {
        return res.sendStatus(401);
    }

    try {
        const userId = await redisClient.get(`rt:${oldRefreshToken}`);
        if (!userId) {
            return res.status(403).json({ message: 'Refresh token invalid or expired.' });
        }

        jwt.verify(
            oldRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, decoded) => {
                if (err) {
                    await redisClient.del(`rt:${oldRefreshToken}`);
                    await redisClient.srem(`user:rt:${userId}`, oldRefreshToken);
                    return res.status(403).json({ message: 'Refresh token invalid.' });
                }

                await redisClient.del(`rt:${oldRefreshToken}`);
                await redisClient.srem(`user:rt:${userId}`, oldRefreshToken);

                const { accessToken, refreshToken } = await generateTokens({
                    id: userId,
                    email: decoded.email,
                    role: decoded.role
                });

                return res.json({ accessToken, refreshToken });
            }
        );

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during token refresh.' });
    }
};

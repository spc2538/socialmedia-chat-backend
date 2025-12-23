const jwt = require('jsonwebtoken');
const redisClient = require('../redisClient');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    try {
      const isWhitelisted = await redisClient.exists(`at:${token}`);
      if (!isWhitelisted) {
        return res.status(403).json({ message: 'Token is invalidated (logged out).' });
      }
    } catch (redisError) {
      console.error('Redis check failed:', redisError);
      return res.status(500).json({ message: 'Authentication server error.' });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
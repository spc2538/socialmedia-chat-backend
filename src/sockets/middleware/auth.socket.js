const jwt = require('jsonwebtoken');
const redisClient = require('../../redisClient');

module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return next(new Error('Invalid or expired token'));
      }

      const isWhitelisted = await redisClient.exists(`at:${token}`);
      if (!isWhitelisted) {
        return next(new Error('Token revoked'));
      }

      socket.user = decoded;
      socket.token = token;

      next();
    });
  } catch (err) {
    next(new Error('Socket authentication failed'));
  }
};

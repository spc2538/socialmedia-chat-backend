const express = require('express');
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const authenticateToken = require('./middleware/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/token', authController.token);

router.get('/me', authenticateToken, userController.me);
router.delete('/logout', authenticateToken, authController.logout);

module.exports = router;

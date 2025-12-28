import { Router } from 'express';
import * as authController from '../controllers/authController';
import authenticateToken from '../middleware/auth';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/token', authController.token);
router.post('/logout', authenticateToken, authController.logout);

export default router;

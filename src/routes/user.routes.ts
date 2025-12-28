import { Router } from 'express';
import * as userController from '../controllers/userController';
import authenticateToken from '../middleware/auth';

const router = Router();

router.get('/me', authenticateToken, userController.me);

export default router;

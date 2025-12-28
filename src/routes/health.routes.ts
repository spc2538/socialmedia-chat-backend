import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.send('REST API is running.');
});

export default router;

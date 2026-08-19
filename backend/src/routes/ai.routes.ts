import { Router } from 'express';
import { recommend } from '../controllers/ai.controller';
import { protect } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/recommend', protect, aiLimiter, recommend);

export default router;

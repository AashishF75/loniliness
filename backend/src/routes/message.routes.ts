import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { sendMessage, getConversation } from '../controllers/message.controller';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:userId', protect, getConversation);

export default router;

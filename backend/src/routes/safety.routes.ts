import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { reportUser, blockUser, unblockUser, getBlockedUsers } from '../controllers/safety.controller';

const router = express.Router();

router.post('/report', protect, reportUser);
router.post('/block/:userId', protect, blockUser);
router.delete('/block/:userId', protect, unblockUser);
router.get('/blocks', protect, getBlockedUsers);

export default router;

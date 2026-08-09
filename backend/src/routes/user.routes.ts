import express from 'express';
import { getNearbyUsers, getUserProfile, updateUserProfile } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.put('/profile', protect, updateUserProfile);
router.get('/nearby', protect, getNearbyUsers);
router.get('/:id', protect, getUserProfile);

export default router;

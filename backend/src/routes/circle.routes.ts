import express from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  getCircleMembers,
  addCircleMember,
  updateCirclePermissions,
  removeCircleMember,
  getMyPermissions
} from '../controllers/circle.controller';

const router = express.Router();

router.get('/', protect, getCircleMembers);
router.post('/', protect, addCircleMember);
router.patch('/:memberId/permissions', protect, updateCirclePermissions);
router.delete('/:memberId', protect, removeCircleMember);
router.get('/permissions/:seniorId', protect, getMyPermissions);

export default router;

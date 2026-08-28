import express from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  sendFamilyInvitation,
  getFamilyInvitations,
  acceptFamilyInvitation,
  rejectFamilyInvitation,
  getFamilyMembers,
  getConnectedParents,
  removeFamilyMember,
  getFamilyPermissions,
  updateFamilyPermissions,
  getFamilyMemberEvents
} from '../controllers/family.controller';

const router = express.Router();

router.post('/invite', protect, sendFamilyInvitation);
router.get('/invitations', protect, getFamilyInvitations);
router.post('/invitations/:id/accept', protect, acceptFamilyInvitation);
router.post('/invitations/:id/reject', protect, rejectFamilyInvitation);
router.get('/members', protect, getFamilyMembers);
router.get('/parents', protect, getConnectedParents);
router.delete('/members/:relationshipId', protect, removeFamilyMember);
router.get('/permissions/:relationshipId', protect, getFamilyPermissions);
router.patch('/permissions/:relationshipId', protect, updateFamilyPermissions);
router.get('/events/:targetUserId', protect, getFamilyMemberEvents);

export default router;

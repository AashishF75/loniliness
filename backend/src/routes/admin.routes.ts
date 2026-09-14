import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getUsers,
  getReports,
  resolveReport,
  suspendUser,
  activateUser,
  getEvents,
  removeEvent,
  getVerificationRequests,
  getVerificationRequestById,
  streamVerificationDocument,
  reviewVerificationRequest
} from '../controllers/admin.controller';

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/activate', activateUser);
router.get('/events', getEvents);
router.delete('/events/:id', removeEvent);

// Senior Verification Moderation
router.get('/verification/requests', getVerificationRequests);
router.get('/verification/requests/:id', getVerificationRequestById);
router.get('/verification/document/:id/:type', streamVerificationDocument);
router.put('/verification/requests/:id/review', reviewVerificationRequest);
router.post('/verification/requests/:id/review', reviewVerificationRequest);

export default router;

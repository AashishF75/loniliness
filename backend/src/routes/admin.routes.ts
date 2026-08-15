import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { getDashboardStats, getUsers, getReports, resolveReport, suspendUser, activateUser } from '../controllers/admin.controller';

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/activate', activateUser);

export default router;

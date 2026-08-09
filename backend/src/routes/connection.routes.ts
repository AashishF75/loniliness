import express from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  sendConnectionRequest,
  getIncomingRequests,
  updateConnectionStatus,
  getConnections,
  getOutgoingRequests
} from '../controllers/connection.controller';

const router = express.Router();

router.get('/', protect, getConnections);
router.post('/request', protect, sendConnectionRequest);
router.get('/requests', protect, getIncomingRequests);
router.get('/requests/outgoing', protect, getOutgoingRequests);
router.patch('/:id/accept', protect, (req, res) => {
  req.body.status = 'ACCEPTED';
  updateConnectionStatus(req, res);
});
router.patch('/:id/reject', protect, (req, res) => {
  req.body.status = 'REJECTED';
  updateConnectionStatus(req, res);
});

export default router;

import { Router } from 'express';
import { createEvent, getEvents, getEventById, joinEvent, leaveEvent, updateEvent, deleteEvent } from '../controllers/event.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/', protect, createEvent);
router.get('/', protect, getEvents);
router.get('/:id', protect, getEventById);
router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);

export default router;

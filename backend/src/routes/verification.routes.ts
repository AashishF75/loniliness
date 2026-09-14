import { Router } from 'express';
import { protect, seniorOnly } from '../middleware/auth.middleware';
import { handleVerificationUpload } from '../utils/fileUpload';
import { getVerificationStatus, submitVerification } from '../controllers/verification.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit verification submissions: max 5 attempts per hour per user
const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req: any) => req.user?.id || req.ip || 'anonymous'
});

router.use(protect);

router.get('/status', getVerificationStatus);

router.post(
  '/submit',
  verificationLimiter,
  seniorOnly,
  handleVerificationUpload,
  submitVerification
);

export default router;

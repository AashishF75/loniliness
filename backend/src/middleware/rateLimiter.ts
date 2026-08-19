import rateLimit from 'express-rate-limit';

// Standard 429 response structure
const createRateLimitResponse = (message: string) => ({
  success: false,
  message
});

// Global Rate Limiter
// Chat polls every 2.5s (24/min). A limit of 300/min provides a massive buffer for
// normal navigation, chat, and event loading without hitting limits.
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  message: createRateLimitResponse('Too many requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Login Rate Limiter (Brute-force protection)
// Allows 10 attempts per 15 minutes per IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: createRateLimitResponse('Too many login attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration Rate Limiter
// Allows 10 registrations per hour per IP.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: createRateLimitResponse('Too many registration attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// AI/Gemini Rate Limiter
// Protects against a single user exhausting the Gemini API quota.
// Limits to 15 requests per minute per user ID (or IP if unauthenticated).
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  keyGenerator: (req: any) => {
    return req.user?.id || 'unknown';
  },
  message: createRateLimitResponse('Saathi AI is receiving too many requests from you. Please wait a moment.'),
  standardHeaders: true,
  legacyHeaders: false,
});

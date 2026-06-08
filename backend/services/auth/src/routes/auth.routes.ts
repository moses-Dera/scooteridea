import { Router } from 'express';
import { z } from 'zod';
import { validate, asyncHandler, authRateLimiter } from '@ebike/core';
import { AuthController } from '../controllers/auth.controller';
import { jwtGuard } from '../middleware/jwt.middleware';

export const authRouter = Router();

// ── Validation Schemas ────────────────────────────────────────────────────────
const registerSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1, 'Name is required').max(100),
  phone:    z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number').optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const pushTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
});

// ── Routes ────────────────────────────────────────────────────────────────────
authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(AuthController.register),
);

authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(AuthController.login),
);

authRouter.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(AuthController.refresh),
);

authRouter.post('/logout',       jwtGuard, asyncHandler(AuthController.logout));
authRouter.get('/me',            jwtGuard, asyncHandler(AuthController.me));
authRouter.post('/oauth/google', authRateLimiter, asyncHandler(AuthController.oauthGoogle));

// Register Expo push token — call this on the client immediately after login
authRouter.post(
  '/push-token',
  jwtGuard,
  validate({ body: pushTokenSchema }),
  asyncHandler(AuthController.registerPushToken),
);

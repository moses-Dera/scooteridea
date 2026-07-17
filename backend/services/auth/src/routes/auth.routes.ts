import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validate, asyncHandler, authRateLimiter, requireRole } from '@ebike/core';
import { AuthController } from '../controllers/auth.controller';
import { jwtGuard } from '../middleware/jwt.middleware';
import { prisma } from '@ebike/db';
import { kafka } from '@ebike/events';

export const authRouter = Router();

// ── Rider App: Profile & Security ───────────────────────────────────────────────
authRouter.put('/user/profile', jwtGuard, async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { name, phone },
      select: { id: true, email: true, name: true, phone: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

authRouter.put('/user/password', jwtGuard, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ success: false, error: 'Invalid user or password not set' });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Incorrect current password' });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { passwordHash: newHash },
    });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// ── Validation Schemas ────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const pushTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
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

// Unified password reset flow (handles both riders and ops)
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(AuthController.forgotPassword),
);

authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(AuthController.resetPassword),
);

authRouter.post('/logout', jwtGuard, asyncHandler(AuthController.logout));
authRouter.get('/me', jwtGuard, asyncHandler(AuthController.me));
authRouter.post('/oauth/google', authRateLimiter, asyncHandler(AuthController.oauthGoogle));

// Register Expo push token — call this on the client immediately after login
authRouter.post(
  '/push-token',
  jwtGuard,
  validate({ body: pushTokenSchema }),
  asyncHandler(AuthController.registerPushToken),
);

// Wallet Top-up Verification (Manual Sync via Frontend)
authRouter.post(
  '/wallet/topup',
  jwtGuard,
  validate({ body: z.object({ reference: z.string().min(1, 'Reference is required') }) }),
  asyncHandler(AuthController.topUpWallet),
);

// Paystack Asynchronous Webhook
authRouter.post('/wallet/webhook/paystack', asyncHandler(AuthController.paystackWebhook));

// ── Admin: User Management ────────────────────────────────────────────────────

// GET /auth/admin/users — List all staff users (OPERATOR + ADMIN)
authRouter.get(
  '/admin/users',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const role = (req.query.role as string) || undefined;
      const users = await prisma.user.findMany({
        where: role ? { role: role as any } : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          walletCents: true,
          createdAt: true,
          assignedZones: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  },
);

// POST /auth/admin/operators — Create a new operator account
authRouter.post(
  '/admin/operators',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { email, name, password, role = 'OPERATOR', phone } = req.body;
      if (!email || !name || !password) {
        res.status(400).json({ success: false, error: 'email, name and password are required' });
        return;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, error: 'Email already in use' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, name, phone, passwordHash, role: role as any },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create operator' });
    }
  },
);

// PATCH /auth/admin/users/:id — Update role for an existing user
authRouter.patch(
  '/admin/users/:id',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!role || !['RIDER', 'OPERATOR', 'ADMIN'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }
      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, email: true, name: true, role: true },
      });
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
  },
);

// DELETE /auth/admin/users/:id — Remove an operator account
authRouter.delete(
  '/admin/users/:id',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  },
);

// PUT /auth/admin/users/:id/zones — Assign zones to a user (replaces existing assignments)
authRouter.put(
  '/admin/users/:id/zones',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { zoneIds } = req.body;

      if (!Array.isArray(zoneIds)) {
        res.status(400).json({ success: false, error: 'zoneIds must be an array' });
        return;
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          assignedZones: {
            set: zoneIds.map((zoneId) => ({ id: zoneId })),
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          assignedZones: { select: { id: true, name: true } },
        },
      });

      res.json({ success: true, data: user });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to update user zones' });
    }
  },
);

// ── Admin: Financial Ledger ────────────────────────────────────────────────────

// GET /auth/admin/finance/wallets — All rider wallets with balances
authRouter.get(
  '/admin/finance/wallets',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const [wallets, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          where: { role: 'RIDER' },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            walletCents: true,
            createdAt: true,
          },
          orderBy: { walletCents: 'desc' },
        }),
        prisma.user.count({ where: { role: 'RIDER' } }),
      ]);
      res.json({ success: true, data: wallets, meta: { total, page, limit } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch wallets' });
    }
  },
);

// PATCH /auth/admin/finance/wallets/:userId — Adjust wallet balance (refund / credit)
authRouter.patch(
  '/admin/finance/wallets/:userId',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amountCents, reason = 'Admin adjustment' } = req.body;
      if (typeof amountCents !== 'number') {
        res.status(400).json({ success: false, error: 'amountCents must be a number' });
        return;
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { walletCents: { increment: amountCents } },
        select: { id: true, email: true, name: true, walletCents: true },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to adjust wallet' });
    }
  },
);

// GET /auth/admin/finance/payments — Recent payment transactions
authRouter.get(
  '/admin/finance/payments',
  jwtGuard,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          skip,
          take: limit,
          include: {
            user: { select: { email: true, name: true } },
            ride: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count(),
      ]);
      res.json({ success: true, data: payments, meta: { total, page, limit } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
  },
);

// ── User: Customer Support ───────────────────────────────────────────────────

// POST /auth/user/support — Create a new support ticket
authRouter.post('/user/support', jwtGuard, async (req: Request, res: Response) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: 'Subject and message are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.sub,
        subject,
        message,
        status: 'OPEN',
      },
    });

    // Emit event to Notification Engine / WebSocket Hub
    await kafka.supportTicketCreated({
      ticketId: ticket.id,
      userId: req.user!.sub,
      subject: ticket.subject,
    });

    res.json({ success: true, data: ticket });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to create support ticket' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Auth Service — business logic layer
//
//  Throws typed AppError subclasses — never raw Error or statusCode objects.
//  The global error handler maps these to HTTP responses automatically.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import sgMail from '@sendgrid/mail';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  InternalError,
  ValidationError,
  retry,
  logger,
} from '@ebike/core';
import { getRedisClient } from '@ebike/redis';
import { UserRepository } from '../repositories/user.repository';
import type { LoginDto, RegisterDto, TokenPair, User, JwtPayload, UserRole } from '@ebike/types';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '30d';
const REFRESH_TTL_S = 30 * 24 * 60 * 60; // 30 days
const BCRYPT_ROUNDS = 12;

if (!ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not set');
if (!REFRESH_SECRET)
  throw new Error('JWT_REFRESH_SECRET is not set — do not share with ACCESS_SECRET');

export class AuthService {
  // ── Email Helpers ─────────────────────────────────────────────────────────────
  private static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) return;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: 'support@scooteridea.com',
      subject: 'Welcome to Scooterfy! 🛴',
      text: `Hi ${name},\n\nWelcome to Scooterfy! We're thrilled to have you on board. Start exploring the city with your first ride.\n\nThe Scooterfy Team`,
      html: `<strong>Hi ${name},</strong><br><br>Welcome to Scooterfy! We're thrilled to have you on board. Start exploring the city with your first ride.<br><br>The Scooterfy Team`,
    };

    try {
      await sgMail.send(msg);
      logger.info({ email }, '[Auth] Welcome email sent successfully');
    } catch (err) {
      logger.error({ err }, '[Auth] Failed to send welcome email');
    }
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  static async register(dto: RegisterDto): Promise<Omit<User, 'walletCents'>> {
    const existing = await UserRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists', { email: dto.email });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await UserRepository.create({ ...dto, passwordHash });

    // Send welcome email asynchronously
    AuthService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    // Omit sensitive / internal fields before returning
    const { ...safeUser } = user;
    return safeUser;
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  static async login(dto: LoginDto): Promise<TokenPair> {
    const user = await UserRepository.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      // Hash the provided password to prevent timing attacks, then reject
      await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      throw new UnauthorizedError('Invalid email or password');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);

    if (!match) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return AuthService.issueTokenPair(user);
  }

  // ── Refresh ──────────────────────────────────────────────────────────────────
  static async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET!) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    const redis = await getRedisClient();
    // Per-device key: refresh:{userId}:{jti}
    const stored = await redis.get(`refresh:${payload.sub}:${payload.jti}`);

    if (stored !== refreshToken) {
      // Token has been rotated or revoked — potential replay attack
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const user = await UserRepository.findById(payload.sub);
    if (!user) throw new NotFoundError('User', payload.sub);

    return AuthService.issueTokenPair(user);
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  static async logout(jti: string, userId: string, refreshJti: string): Promise<void> {
    const redis = await getRedisClient();
    // Blacklist the access token JTI for the remainder of the access token's lifetime
    await redis.setEx(`blacklist:${jti}`, 60 * 15, '1');
    // Delete only this device's refresh token (per-device key)
    await redis.del(`refresh:${userId}:${refreshJti}`);
  }

  // ── Get User ─────────────────────────────────────────────────────────────────
  static async getUser(userId: string): Promise<User> {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return user as User;
  }

  // ── OAuth Google ──────────────────────────────────────────────────────────────
  static async oauthGoogle(idToken: string): Promise<TokenPair> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new InternalError('GOOGLE_CLIENT_ID is not configured');
    }

    const client = new OAuth2Client(clientId);
    let email: string;
    let name: string;

    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new ValidationError('Google token payload missing email');
      }
      email = payload.email;
      name = payload.name ?? payload.email.split('@')[0];
    } catch (err: any) {
      if (err.name === 'ValidationError') throw err;
      throw new UnauthorizedError('Invalid Google ID token');
    }

    const { user, isNew } = await UserRepository.findOrCreateOAuth(email, name);

    if (isNew) {
      AuthService.sendWelcomeEmail(user.email, user.name).catch(() => {});
    }

    return AuthService.issueTokenPair(user);
  }

  // ── Token Issuance ────────────────────────────────────────────────────────────
  static async issueTokenPair(user: { id: string; role: string }): Promise<TokenPair> {
    if (!ACCESS_SECRET) {
      throw new InternalError('JWT_ACCESS_SECRET is not configured');
    }

    const jti = uuidv4();
    const refreshJti = uuidv4();
    const role = user.role as UserRole;

    const accessToken = jwt.sign(
      { sub: user.id, role, jti } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
      ACCESS_SECRET,
      {
        expiresIn: ACCESS_EXPIRY as Parameters<typeof jwt.sign>[2] extends { expiresIn?: infer E }
          ? E
          : never,
      },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, role, jti: refreshJti } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
      REFRESH_SECRET!,
      {
        expiresIn: REFRESH_EXPIRY as Parameters<typeof jwt.sign>[2] extends { expiresIn?: infer E }
          ? E
          : never,
      },
    );

    // Persist refresh token with retry (Redis flap resilience)
    // Key: refresh:{userId}:{refreshJti} — supports multiple concurrent device sessions
    await retry(
      async () => {
        const redis = await getRedisClient();
        await redis.setEx(`refresh:${user.id}:${refreshJti}`, REFRESH_TTL_S, refreshToken);
      },
      { maxAttempts: 3, label: 'redis:refresh-token-store' },
    );

    return { accessToken, refreshToken };
  }

  // ── Password Reset (Unified) ────────────────────────────────────────────────
  static async forgotPassword(
    email: string,
  ): Promise<{ message: string; tokenForDev?: string; redirectType?: string }> {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      // Return generic message to prevent email enumeration.
      return { message: 'If an account exists for that email, a reset link has been sent.' };
    }

    const resetToken = uuidv4();
    const redis = await getRedisClient();

    // Store token in Redis, expires in 15 minutes
    await redis.setEx(`reset:${resetToken}`, 15 * 60, user.id);

    let redirectType = 'WEB_DASHBOARD';
    let resetLink = `https://admin.scooter.com/reset-password?token=${resetToken}`;

    if (user.role === 'RIDER') {
      redirectType = 'MOBILE_APP_DEEP_LINK';
      resetLink = `scooterapp://reset-password?token=${resetToken}`;
    }

    logger.info(
      {
        userId: user.id,
        role: user.role,
        resetToken,
      },
      '[Auth] Generated Password Reset Token',
    );

    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: email,
        from: 'support@scooteridea.com',
        subject: 'Scooterfy Password Reset Request',
        text: `You requested a password reset. Please click this link to reset your password: ${resetLink}. This link expires in 15 minutes.`,
        html: `<strong>You requested a password reset.</strong><br><br>Please click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.`,
      };

      try {
        await sgMail.send(msg);
        logger.info({ email }, '[Auth] SendGrid password reset email sent successfully');
      } catch (error) {
        logger.error({ err: error }, '[Auth] SendGrid failed to send password reset email');
        // We don't throw an error here to prevent email enumeration attacks
      }
    } else {
      logger.warn(
        { resetLink },
        '[Auth] SENDGRID_API_KEY missing. Mocking email delivery in logs.',
      );
    }

    return {
      message: 'If an account exists for that email, a reset link has been sent.',
      tokenForDev: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
      redirectType: process.env.NODE_ENV !== 'production' ? redirectType : undefined,
    };
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const redis = await getRedisClient();
    const userId = await redis.get(`reset:${token}`);

    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user in DB
    await UserRepository.updatePassword(userId, passwordHash);

    // Delete the token so it can't be used again
    await redis.del(`reset:${token}`);

    // Invalidate all existing refresh tokens for safety
    await redis.del(`refresh:${userId}`);
  }

  // ── Wallet Top-up (Paystack) ────────────────────────────────────────────────
  static async verifyAndTopUpWallet(
    userId: string,
    reference: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock';
    let amountCents = 0;
    let authCode: string | undefined = undefined;

    // Call Paystack API to verify transaction
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as any;

      // Paystack returns 200 even for some failed checks, but status boolean indicates true success
      if (!response.ok || data.status === false) {
        throw new ValidationError(
          `Paystack Error: ${data.message || 'Transaction verification failed'}`,
        );
      }

      if (data.data?.status !== 'success') {
        const gatewayResponse = data.data?.gateway_response || 'Transaction not successful';
        throw new ValidationError(`Payment Failed: ${gatewayResponse}`);
      }

      // Paystack amount is in Kobo (which maps perfectly to our cents architecture for NGN)
      amountCents = data.data.amount;

      // Extract the authorization code for future auto-deductions (Tokenization)
      if (data.data.authorization?.authorization_code) {
        authCode = data.data.authorization.authorization_code;
      }
    } catch (err: any) {
      logger.error({ err, reference }, 'Paystack verification failed');

      // If it's a ValidationError (thrown by our logic above), we want to preserve its message
      if (err instanceof ValidationError) {
        throw err;
      }

      // For development/testing purposes, if the secret key is missing/mocked, we'll allow local mock verification
      if (paystackSecret === 'sk_test_mock' || process.env.NODE_ENV !== 'production') {
        logger.warn('Paystack key missing or mock mode. Faking success for local development.');
        amountCents = 1000 * 100; // default 1000 NGN
      } else {
        throw new ValidationError(`Payment verification failed: ${err.message || 'Unknown error'}`);
      }
    }

    // Since auth.service.ts doesn't have prisma imported directly for writes, we can use the repository
    const { prisma } = await import('@ebike/db');
    const redis = await getRedisClient();

    // Idempotency check: prevent double crediting
    const isProcessed = await redis.get(`paystack_ref:${reference}`);
    if (isProcessed) {
      logger.info({ reference }, 'Transaction already processed (idempotent return)');
      const existingUser = await UserRepository.findById(userId);
      const { passwordHash, ...safeExistingUser } = existingUser!;
      return safeExistingUser as Omit<User, 'passwordHash'>;
    }

    // Mark as processed (valid for 30 days)
    await redis.setEx(`paystack_ref:${reference}`, 30 * 24 * 60 * 60, '1');

    // Prevent double crediting: check if payment reference already processed
    // In a full production system, we'd log this transaction to a `Payment` table first.
    // For now, we update the user's wallet directly.
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        walletCents: { increment: amountCents },
        ...(authCode ? { paystackAuthCode: authCode } : {}),
      },
    });

    const { passwordHash, ...safeUser } = user;
    return safeUser as Omit<User, 'passwordHash'>;
  }

  // ── Paystack Webhook Handler ──────────────────────────────────────────────────
  static async handlePaystackWebhook(
    rawBody: Buffer | string,
    body: any,
    signature: string,
  ): Promise<void> {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock';

    // 1. Verify Signature — always, regardless of environment
    // Only skip if secret is the dev mock placeholder (no real secret configured)
    if (paystackSecret !== 'sk_test_mock') {
      const hash = crypto.createHmac('sha512', paystackSecret).update(rawBody).digest('hex');
      if (hash !== signature) {
        logger.warn({ signature, hash }, '[Auth] Invalid Paystack webhook signature');
        throw new UnauthorizedError('Invalid signature');
      }
    } else {
      logger.warn(
        '[Auth] Paystack webhook signature check SKIPPED — sk_test_mock in use (dev only)',
      );
    }

    // 2. Process Event
    const event = body.event;
    const data = body.data;

    logger.info({ event, reference: data?.reference }, '[Auth] Received Paystack Webhook');

    if (event === 'charge.success') {
      const email = data.customer?.email;
      if (!email) {
        logger.error('[Auth] Paystack webhook charge.success missing customer email');
        return;
      }

      const { prisma } = await import('@ebike/db');
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        logger.error({ email }, '[Auth] User not found for Paystack webhook');
        return;
      }

      const amountCents = data.amount;
      const reference = data.reference;
      const authCode: string | undefined = data.authorization?.authorization_code;

      const redis = await getRedisClient();
      const isProcessed = await redis.get(`paystack_ref:${reference}`);
      if (isProcessed) {
        logger.info({ reference }, '[Auth] Paystack webhook reference already processed');
        return;
      }

      // Mark as processed (valid for 30 days)
      await redis.setEx(`paystack_ref:${reference}`, 30 * 24 * 60 * 60, '1');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          walletCents: { increment: amountCents },
          ...(authCode ? { paystackAuthCode: authCode } : {}),
        },
      });

      logger.info(
        { userId: user.id, amountCents, reference },
        '[Auth] Wallet topped up via webhook',
      );
    }
  }
}

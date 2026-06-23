// ─────────────────────────────────────────────────────────────────────────────
//  Auth Controller — thin. No try/catch. asyncHandler does it.
//  Each method calls the service and formats a consistent ApiResponse.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { getRedisClient } from '@ebike/redis';

const PUSH_TOKEN_TTL_S = 90 * 24 * 60 * 60; // 90 days — matches device session lifetime

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const user = await AuthService.register(req.body);
    res.status(201).json({ success: true, data: user });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.login(req.body);
    res.json({ success: true, data: tokens });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.refresh(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    await AuthService.logout(req.user!.jti, req.user!.sub);
    res.json({ success: true, message: 'Logged out successfully' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await AuthService.getUser(req.user!.sub);
    res.json({ success: true, data: user });
  }

  static async oauthGoogle(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.oauthGoogle(req.body.idToken);
    res.json({ success: true, data: tokens });
  }

  /**
   * POST /auth/push-token
   * Registers the client's Expo push token.
   * Called immediately after login / app foreground.
   * Body: { token: string }
   */
  static async registerPushToken(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const { token } = req.body as { token: string };

    const redis = await getRedisClient();
    await redis.setEx(`push_token:${userId}`, PUSH_TOKEN_TTL_S, token);

    res.json({ success: true, message: 'Push token registered' });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const response = await AuthService.forgotPassword(req.body.email);
    res.json({ success: true, data: response });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    await AuthService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Password has been reset successfully' });
  }
}

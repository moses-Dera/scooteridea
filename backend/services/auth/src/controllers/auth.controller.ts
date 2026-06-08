// ─────────────────────────────────────────────────────────────────────────────
//  Auth Controller — thin. No try/catch. asyncHandler does it.
//  Each method calls the service and formats a consistent ApiResponse.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

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
}

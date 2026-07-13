import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '@ebike/redis';
import type { JwtPayload } from '@ebike/types';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function jwtGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing token' });
    return;
  }

  const token = authHeader.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  // Check blacklist
  const redis = await getRedisClient();
  const blacklisted = await redis.get(`blacklist:${payload.jti}`);
  if (blacklisted) {
    res.status(401).json({ success: false, error: 'Token revoked' });
    return;
  }

  req.user = payload;
  next();
}

/** Role guard — use after jwtGuard. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

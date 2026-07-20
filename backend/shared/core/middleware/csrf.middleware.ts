import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'csrf-fallback-secret',
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  getTokenFromRequest: (req: Request) =>
    (req.headers['x-csrf-token'] as string) ?? (req.body?._csrf as string | undefined),
});

export { doubleCsrfProtection as csrfProtection };

/** GET /csrf-token — call this once on app load to seed the CSRF cookie */
export function csrfTokenHandler(req: Request, res: Response) {
  res.json({ csrfToken: generateToken(req, res) });
}

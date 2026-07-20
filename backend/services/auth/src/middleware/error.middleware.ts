import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface AppError extends Error {
  statusCode?: number;
}

const sanitize = (val: unknown) => String(val).replace(/[\r\n\t]/g, ' ').slice(0, 500);

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    return;
  }

  const status = err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) console.error('[Unhandled Error]', sanitize(err.message), sanitize(err.stack ?? ''));

  res.status(status).json({ success: false, error: message });
}

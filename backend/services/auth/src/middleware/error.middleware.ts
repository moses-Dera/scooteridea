import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: 'Validation error', details: err.errors });
    return;
  }

  const status = err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) console.error('[Unhandled Error]', err);

  res.status(status).json({ success: false, error: message });
}

// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Express Middleware Suite
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodSchema, ZodError } from 'zod';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { AppError, ValidationError, isAppError, isOperationalError } from '../errors/AppError';
import { logger } from '../logger';

// ── 1. Request ID ─────────────────────────────────────────────────────────────
//  Attaches a correlation ID to every request.
//  If the upstream gateway already set X-Request-ID (trace propagation), we reuse it.
//  The ID is also added to the response header so clients can correlate.

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// ── 2. Zod Request Validation ─────────────────────────────────────────────────
//  Usage:  router.post('/', validate({ body: MySchema }), controller)
//
//  Validates req.body, req.params, and req.query independently.
//  Throws ValidationError (400) with full Zod issue list on failure.

type ValidateSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Request validation failed', err.errors));
      } else {
        next(err);
      }
    }
  };
}

// ── 3. Async Handler Wrapper ──────────────────────────────────────────────────
//  Eliminates the need for try/catch in every controller method.
//  Usage:  router.get('/', asyncHandler(async (req, res) => { ... }))

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── 4. Not Found Handler ──────────────────────────────────────────────────────
//  Mount AFTER all routes to catch unmatched paths.

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(`Route not found: ${req.method} ${req.url}`, {
      statusCode: 404,
      code: 'ROUTE_NOT_FOUND',
    }),
  );
}

// ── 5. Global Error Handler ───────────────────────────────────────────────────
//  Must be registered with 4 arguments (err, req, res, next).
//
//  Behaviour:
//    - AppError (isOperational)  → log warn, return structured JSON
//    - AppError (!isOperational) → log error + full stack, return 500, capture to Sentry
//    - ZodError                  → convert to ValidationError
//    - Prisma errors             → map known codes to AppError
//    - Unknown Error             → log error, return 500 (never leak stack in prod)

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.headers['x-user-id'] as string | undefined;

  // ── Normalise ──────────────────────────────────────────────────────────────
  let appErr: AppError;

  if (isAppError(err)) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = new ValidationError('Validation failed', err.errors);
  } else if (isPrismaError(err)) {
    appErr = mapPrismaError(err);
  } else if (err instanceof Error) {
    appErr = new AppError(err.message, {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
      cause: err,
    });
  } else {
    appErr = new AppError('An unexpected error occurred', {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
    });
  }

  // ── Log ───────────────────────────────────────────────────────────────────
  const logPayload = {
    requestId,
    userId,
    err: {
      name: appErr.name,
      code: appErr.code,
      message: appErr.message,
      context: appErr.context,
      stack: appErr.stack,
    },
  };

  if (isOperationalError(appErr)) {
    logger.warn(logPayload, `[${appErr.code}] ${appErr.message}`);
  } else {
    logger.error(logPayload, `[UNHANDLED] ${appErr.message}`);
    // Beam non-operational (500) crashes directly to Sentry
    Sentry.captureException(err instanceof Error ? err : appErr, {
      tags: { requestId, userId, errorCode: appErr.code },
    });
  }

  // ── Respond ───────────────────────────────────────────────────────────────
  // Never expose internal stack traces or raw DB errors to clients
  const isProduction = process.env.NODE_ENV === 'production';

  const body: Record<string, unknown> = {
    success: false,
    error: appErr.code,
    message: isOperationalError(appErr) ? appErr.message : 'An unexpected error occurred',
    requestId,
  };

  // Attach validation details in non-prod (or always for 4xx)
  if (appErr instanceof ValidationError) {
    body.details = appErr.details;
  }

  // In development, expose stack for debugging
  if (!isProduction && !isOperationalError(appErr)) {
    body.stack = appErr.stack;
  }

  res.status(appErr.statusCode).json(body);
}

// ── 6. Rate Limiting ──────────────────────────────────────────────────────────

/** Standard API rate limiter (per IP). */
export const standardRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again shortly.',
  },
  skip: (req) => req.path === '/health',
});

/** Authenticated user rate limiter (keyed by IP — set by Nginx, not forgeable by clients). */
export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMITED', message: 'Request limit reached.' },
});

/** Strict limiter for sensitive auth endpoints. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'AUTH_RATE_LIMITED',
    message: 'Too many auth attempts. Please wait 15 minutes.',
  },
});

// ── Prisma Error Mapping ──────────────────────────────────────────────────────

interface PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaError(err: unknown): err is PrismaClientKnownRequestError {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false;
  const code = (err as Record<string, unknown>).code;
  return typeof code === 'string' && code.startsWith('P');
}

function mapPrismaError(err: PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002':
      return new AppError(`Unique constraint violation: ${JSON.stringify(err.meta?.target)}`, {
        statusCode: 409,
        code: 'CONFLICT',
        context: { prismaCode: err.code, meta: err.meta },
      });
    case 'P2025':
      return new AppError('Record not found', {
        statusCode: 404,
        code: 'NOT_FOUND',
        context: { prismaCode: err.code, meta: err.meta },
      });
    case 'P2003':
      return new AppError('Foreign key constraint failed', {
        statusCode: 409,
        code: 'CONFLICT',
        context: { prismaCode: err.code, meta: err.meta },
      });
    default:
      return new AppError('Database operation failed', {
        statusCode: 500,
        code: 'DB_ERROR',
        isOperational: false,
        context: { prismaCode: err.code },
        cause: err,
      });
  }
}

export * from './auth';

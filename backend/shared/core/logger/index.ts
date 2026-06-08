// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Structured Logger (Pino)
//
//  - JSON in production, pretty-printed in development
//  - Every log line carries:  level, time, service, requestId (when available)
//  - Child loggers inherit context (requestId, userId, rideId, …)
//  - pino-http middleware auto-logs every request with latency + status
// ─────────────────────────────────────────────────────────────────────────────

import pino, { Logger, LoggerOptions } from 'pino';
import pinoHttp from 'pino-http';
import { Request } from 'express';

const SERVICE_NAME = process.env.SERVICE_NAME ?? 'ebike-service';
const LOG_LEVEL    = process.env.LOG_LEVEL    ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const baseOptions: LoggerOptions = {
  level: LOG_LEVEL,
  base: {
    service: SERVICE_NAME,
    env:     process.env.NODE_ENV ?? 'development',
  },
  // Production: pure JSON. Development: human-readable.
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  redact: {
    // Never log sensitive fields
    paths: ['*.password', '*.passwordHash', '*.token', '*.refreshToken', '*.cardNumber', '*.cvv'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

/** Root application logger. */
export const logger: Logger = pino(baseOptions);

// ── Child loggers (attach context) ────────────────────────────────────────────

export function childLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

/** Create a logger bound to a specific request (use inside middleware). */
export function requestLogger(requestId: string, userId?: string): Logger {
  return logger.child({ requestId, userId });
}

// ── HTTP request logging middleware ──────────────────────────────────────────

export const httpLogger = pinoHttp({
  logger,
  // Attach requestId from header (injected by our requestId middleware)
  customProps: (req: Request) => ({
    requestId: req.headers['x-request-id'] ?? 'unknown',
    userId:    req.headers['x-user-id']    ?? undefined,
  }),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400)        return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (_req, _res, err) =>
    `Request failed: ${err.message}`,
  // Silence health checks to avoid log noise
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});

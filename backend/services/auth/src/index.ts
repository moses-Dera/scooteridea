// ─────────────────────────────────────────────────────────────────────────────
//  Auth Service — index.ts
//
//  Senior-level Express bootstrap:
//    1. Structured logging (pino)
//    2. Request correlation IDs
//    3. Security headers (helmet)
//    4. Rate limiting (global + auth-specific)
//    5. Liveness + readiness health endpoints
//    6. Route registration
//    7. 404 catch-all
//    8. Global error handler
//    9. Graceful shutdown (SIGTERM drain)
//   10. Health probes for Postgres + Redis
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import { prisma } from '@ebike/db';

import {
  httpLogger,
  logger,
  requestId,
  standardRateLimiter,
  userRateLimiter,
  notFoundHandler,
  errorHandler,
  healthRouter,
  registerProbe,
  setupGracefulShutdown,
  registerCleanup,
} from '@ebike/core';
import { getRedisClient, disconnectRedis } from '@ebike/redis';

import { authRouter } from './routes/auth.routes';
import { csrfTokenHandler } from '@ebike/core';

// ── Prisma (shared singleton from @ebike/db) ────────────────────────────────

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

process.env.SERVICE_NAME = 'auth-service';

// ── Security ──────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  }),
);

// ── Request Lifecycle ─────────────────────────────────────────────────────────
app.use(requestId); // Attach + propagate X-Request-ID
app.use(httpLogger); // Structured pino-http logging
app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(standardRateLimiter);
app.use(userRateLimiter);
app.use(cookieParser(process.env.CSRF_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'csrf-fallback-secret'));

// ── Health Checks ─────────────────────────────────────────────────────────────
app.use(healthRouter());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/auth/csrf-token', csrfTokenHandler);
app.use('/auth', authRouter);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe(
  'postgres',
  async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  },
  { critical: true },
);

registerProbe(
  'redis',
  async () => {
    const redis = await getRedisClient();
    await redis.ping();
    return { status: 'ok' };
  },
  { critical: true },
);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  // Verify critical connections before accepting traffic
  try {
    await prisma.$connect();
    logger.info('[Auth] Postgres connected');

    await getRedisClient();
    logger.info('[Auth] Redis connected');
  } catch (err) {
    logger.fatal({ err }, '[Auth] Failed to connect to dependencies — aborting startup');
    process.exit(1);
  }

  const server = http.createServer(app);

  // Register cleanup callbacks (SIGTERM drain)
  registerCleanup('Postgres', () => prisma.$disconnect());
  registerCleanup('Redis', () => disconnectRedis());

  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Auth Service] Ready');
  });
}

bootstrap();

export default app;

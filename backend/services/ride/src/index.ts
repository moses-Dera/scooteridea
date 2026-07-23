// ─────────────────────────────────────────────────────────────────────────────
//  Ride Service — index.ts
//
//  Senior-level Express bootstrap (mirrors auth-service / fleet-service pattern):
//    1. Structured pino logging + request correlation IDs
//    2. Security headers (helmet) + CORS
//    3. Rate limiting
//    4. Liveness + readiness health endpoints with Postgres + Redis probes
//    5. Route registration
//    6. 404 + global error handler
//    7. Graceful shutdown (SIGTERM drain)
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { prisma } from '@ebike/db';

import {
  httpLogger,
  logger,
  requestId,
  standardRateLimiter,
  notFoundHandler,
  errorHandler,
  healthRouter,
  registerProbe,
  setupGracefulShutdown,
  registerCleanup,
} from '@ebike/core';
import { getRedisClient, disconnectRedis } from '@ebike/redis';
import { connectProducer, disconnectProducer } from '@ebike/events';

import { rideRouter } from './routes/ride.routes';

// ── Prisma (shared singleton from @ebike/db) ─────────────────────────────────

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.RIDE_PORT ?? process.env.PORT ?? 3003);

process.env.SERVICE_NAME = 'ride-service';

// ── Middleware ─────────────────────────────────────────────────────────────────
app.set('trust proxy', true);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  }),
);

// ── Request Lifecycle ─────────────────────────────────────────────────────────
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: '512kb' }));
app.use(standardRateLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.use(healthRouter());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/rides', rideRouter);

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
  try {
    await prisma.$connect();
    logger.info('[Ride] Postgres connected');

    await getRedisClient();
    logger.info('[Ride] Redis connected');

    await connectProducer();
    logger.info('[Ride] Redis event producer connected');
  } catch (err) {
    logger.fatal({ err }, '[Ride] Dependency connection failed — aborting startup');
    process.exit(1);
  }

  registerCleanup('Postgres', () => prisma.$disconnect());
  registerCleanup('Redis', () => disconnectRedis());
  registerCleanup('Events Producer', () => disconnectProducer());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Ride Service] Ready');
  });
}

bootstrap();

export default app;

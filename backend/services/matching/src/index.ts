// ─────────────────────────────────────────────────────────────────────────────
//  Matching Service — index.ts
//
//  Stateless geo-matching service backed by Redis GEO indexes.
//  Bootstrap pattern mirrors auth-service / fleet-service.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import helmet  from 'helmet';
import cors    from 'cors';
import http    from 'http';

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

import { matchingRouter } from './routes/matching.routes';

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.MATCHING_PORT ?? process.env.PORT ?? 3004);

process.env.SERVICE_NAME = 'matching-service';

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGINS?.split(',') ?? '*',
  credentials: true,
}));

// ── Request Lifecycle ─────────────────────────────────────────────────────────
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: '256kb' }));
app.use(standardRateLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.use(healthRouter());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/match', matchingRouter);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe('redis', async () => {
  const redis = await getRedisClient();
  await redis.ping();
  return { status: 'ok' };
}, { critical: true });

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await getRedisClient();
    logger.info('[Matching] Redis connected');
  } catch (err) {
    logger.fatal({ err }, '[Matching] Redis connection failed — aborting startup');
    process.exit(1);
  }

  registerCleanup('Redis', () => disconnectRedis());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Matching Service] Ready');
  });
}

bootstrap();

export default app;

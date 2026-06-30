// ─────────────────────────────────────────────────────────────────────────────
//  Pricing Service — index.ts
//
//  Surge pricing engine backed by Redis geo-hash demand counters.
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

import { pricingRouter }  from './routes/pricing.routes';
import { PricingService } from './services/pricing.service';

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PRICING_PORT ?? process.env.PORT ?? 3005);

process.env.SERVICE_NAME = 'pricing-service';
app.set('trust proxy', 1);

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
app.use('/pricing', pricingRouter);

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
    logger.info('[Pricing] Redis connected');
  } catch (err) {
    logger.fatal({ err }, '[Pricing] Redis connection failed — aborting startup');
    process.exit(1);
  }

  // Run surge recalculation immediately and every 60 seconds
  await PricingService.recalculateSurge().catch((err) =>
    logger.warn({ err }, '[Pricing] Initial surge recalculation failed'),
  );
  const surgeInterval = setInterval(() =>
    PricingService.recalculateSurge().catch((err) =>
      logger.warn({ err }, '[Pricing] Surge recalculation failed'),
    ),
    60_000,
  );

  registerCleanup('Redis',           () => disconnectRedis());
  registerCleanup('SurgeInterval',   () => { clearInterval(surgeInterval); return Promise.resolve(); });

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Pricing Service] Ready');
  });
}

bootstrap();

export default app;

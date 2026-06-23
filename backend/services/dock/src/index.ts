// ─────────────────────────────────────────────────────────────────────────────
//  Dock Service — index.ts
//
//  MQTT-driven dock telemetry ingestion + REST API.
//  Bootstrap pattern mirrors auth-service / fleet-service.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import helmet  from 'helmet';
import cors    from 'cors';
import http    from 'http';
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
import { getMqttClient } from '@ebike/mqtt';

import { DockService } from './services/dock.service';
import { dockRouter }  from './routes/dock.routes';

// ── Prisma (shared singleton from @ebike/db) ────────────────────────────────

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.DOCK_PORT ?? process.env.PORT ?? 3009);

process.env.SERVICE_NAME = 'dock-service';

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
app.use('/docks', dockRouter);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe('postgres', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
}, { critical: true });

registerProbe('redis', async () => {
  const redis = await getRedisClient();
  await redis.ping();
  return { status: 'ok' };
}, { critical: true });

registerProbe('mqtt', async () => {
  const client = getMqttClient();
  return {
    status: client.connected ? 'ok' : 'down',
    detail: client.connected ? undefined : 'MQTT broker disconnected',
  };
}, { critical: false }); // non-critical: service still handles REST while reconnecting

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('[Dock] Postgres connected');

    await getRedisClient();
    logger.info('[Dock] Redis connected');

    await connectProducer();
    logger.info('[Dock] Redis event producer connected');
  } catch (err) {
    logger.fatal({ err }, '[Dock] Dependency connection failed — aborting startup');
    process.exit(1);
  }

  // MQTT ingestion — non-blocking; broker reconnects automatically
  await DockService.startMqttIngestion();

  registerCleanup('Postgres',       () => prisma.$disconnect());
  registerCleanup('Redis',          () => disconnectRedis());
  registerCleanup('Events Producer', () => disconnectProducer());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Dock Service] Ready');
  });
}

bootstrap();

export default app;

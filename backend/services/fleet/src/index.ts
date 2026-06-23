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
import { connectProducer, disconnectProducer } from '@ebike/events';
import { getMqttClient } from '@ebike/mqtt';
import { prisma } from '@ebike/db';

import { fleetRouter } from './routes/fleet.routes';
import { FleetService } from './services/fleet.service';
import { calculateBatteryEfficiency } from './services/efficiency.cron';

const app    = express();
const PORT   = Number(process.env.PORT ?? 3002);
process.env.SERVICE_NAME = 'fleet-service';

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(requestId);
app.use(httpLogger);
app.use(express.json({ limit: '512kb' }));
app.use(standardRateLimiter);

// ── Health + Routes ───────────────────────────────────────────────────────────
app.use(healthRouter());
app.use('/fleet', fleetRouter);
app.use(notFoundHandler);
app.use(errorHandler);

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe('postgres', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
}, { critical: true });

registerProbe('redis', async () => {
  const r = await getRedisClient();
  await r.ping();
  return { status: 'ok' };
}, { critical: true });

registerProbe('mqtt', async () => {
  const client = getMqttClient();
  return { status: client.connected ? 'ok' : 'down', detail: client.connected ? undefined : 'MQTT broker disconnected' };
}, { critical: false }); // non-critical: service can still serve REST while reconnecting

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('[Fleet] Postgres connected');
    await getRedisClient();
    logger.info('[Fleet] Redis connected');
    await connectProducer();
    logger.info('[Fleet] Redis event producer connected');
  } catch (err) {
    logger.fatal({ err }, '[Fleet] Dependency connection failed — aborting startup');
    process.exit(1);
  }

  // Start MQTT ingestion (non-blocking — MQTT reconnects automatically)
  await FleetService.startMqttIngestion();

  // Schedule battery efficiency cron — runs immediately then every 24h
  calculateBatteryEfficiency().catch((err) =>
    logger.warn({ err }, '[Fleet] Initial efficiency calculation failed'),
  );
  const efficiencyInterval = setInterval(() =>
    calculateBatteryEfficiency().catch((err) =>
      logger.warn({ err }, '[Fleet] Efficiency cron failed'),
    ),
    24 * 60 * 60_000, // 24 hours
  );

  registerCleanup('Postgres',       () => prisma.$disconnect());
  registerCleanup('Redis',          () => disconnectRedis());
  registerCleanup('Events Producer', () => disconnectProducer());
  registerCleanup('EfficiencyCron', () => { clearInterval(efficiencyInterval); return Promise.resolve(); });

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, '[Fleet Service] Ready');
  });
}

bootstrap();

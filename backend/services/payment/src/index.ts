// ─────────────────────────────────────────────────────────────────────────────
//  Payment Service — Kafka consumer with DLQ + retry
//
//  Consumer Group: payment-consumer
//  Topics consumed: payment.charge
//
//  On failure:
//    - Retries up to 3x with exponential backoff
//    - If all retries exhausted → message forwarded to payment.charge.dlq
//    - DLQ messages are monitored, not lost
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import http    from 'http';
import { prisma } from '@ebike/db';

import {
  logger,
  requestId,
  httpLogger,
  healthRouter,
  registerProbe,
  registerCleanup,
  setupGracefulShutdown,
  notFoundHandler,
  errorHandler,
  InsufficientBalanceError,
  InternalError,
  withDLQ,
} from '@ebike/core';
import { getRedisClient, disconnectRedis } from '@ebike/redis';
import { createConsumer, connectProducer, disconnectProducer, publish, TOPICS } from '@ebike/kafka';
import type { KafkaPaymentChargeEvent } from '@ebike/types';

const app    = express();
const PORT   = Number(process.env.PORT ?? 3006);
process.env.SERVICE_NAME = 'payment-service';

app.use(requestId);
app.use(httpLogger);
app.use(express.json());
app.use(healthRouter());
app.use(notFoundHandler);
app.use(errorHandler);

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe('postgres', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
}, { critical: true });

// ── Payment Handler ───────────────────────────────────────────────────────────
async function processPaymentCharge(event: KafkaPaymentChargeEvent): Promise<void> {
  const { userId, amount: amountCents, rideId } = event;
  const log = logger.child({ userId, rideId, amountCents });

  log.info('[Payment] Processing charge');

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.walletCents < amountCents) {
      // Record failed payment
      await tx.payment.create({
        data: {
          userId,
          rideId,
          amountCents,
          currency: 'NGN',
          status:   'failed',
          provider: 'wallet',
        },
      });

      // Emit failure so Notification + Ride services can handle it
      await publish(TOPICS.PAYMENT_RESULT, { rideId, status: 'failed', ts: Date.now() });

      throw new InsufficientBalanceError(amountCents, user.walletCents);
    }

    // Deduct from wallet
    await tx.user.update({
      where: { id: userId },
      data:  { walletCents: { decrement: amountCents } },
    });

    await tx.payment.create({
      data: {
        userId,
        rideId,
        amountCents,
        currency: 'NGN',
        status:   'success',
        provider: 'wallet',
      },
    });

    log.info('[Payment] Wallet deduction successful');
  });

  // Emit success result
  await publish(TOPICS.PAYMENT_RESULT, { rideId, status: 'success', ts: Date.now() });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    await getRedisClient();
    await connectProducer();
  } catch (err) {
    logger.fatal({ err }, '[Payment] Startup connection failed');
    process.exit(1);
  }

  // Kafka consumer with DLQ
  const consumer = createConsumer('payment-consumer');

  const handlerWithDLQ = withDLQ(
    processPaymentCharge,
    (dlqTopic, payload) => publish(dlqTopic, payload as Record<string, unknown>),
    { originalTopic: TOPICS.PAYMENT_CHARGE, retries: 3 },
  );

  await consumer.subscribe([TOPICS.PAYMENT_CHARGE], async (payload) => {
    await handlerWithDLQ(payload as KafkaPaymentChargeEvent);
  });

  registerCleanup('Postgres',       () => prisma.$disconnect());
  registerCleanup('Redis',          () => disconnectRedis());
  registerCleanup('Kafka Producer', () => disconnectProducer());
  registerCleanup('Kafka Consumer', () => consumer.disconnect());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, '[Payment Service] Ready');
  });
}

bootstrap();

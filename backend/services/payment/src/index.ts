// ─────────────────────────────────────────────────────────────────────────────
//  Payment Service — Redis consumer with DLQ + retry
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
import http from 'http';
import { prisma } from '@ebike/db';

import {
  logger,
  requestId,
  httpLogger,
  healthRouter,
  registerCleanup,
  registerProbe,
  setupGracefulShutdown,
  notFoundHandler,
  errorHandler,
  jwtGuard,
  InsufficientBalanceError,
  InternalError,
  withDLQ,
} from '@ebike/core';
import { getRedisClient, disconnectRedis } from '@ebike/redis';
import {
  createConsumer,
  connectProducer,
  disconnectProducer,
  publish,
  TOPICS,
} from '@ebike/events';
import type { KafkaPaymentChargeEvent } from '@ebike/types';

import crypto from 'crypto';

const app = express();
const PORT = Number(process.env.PORT ?? 3006);
process.env.SERVICE_NAME = 'payment-service';

app.use(requestId);
app.use(httpLogger);
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(healthRouter());

// ── Paystack API Endpoints ────────────────────────────────────────────────────

// 1. Generate Checkout Link
app.post('/payments/initialize', async (req, res, next) => {
  try {
    const { email, amountCents } = req.body;
    if (!email || !amountCents) {
      return res.status(400).json({ success: false, message: 'email and amountCents required' });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ success: false, message: 'Paystack secret not configured' });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountCents, // Paystack expects amount in lowest denomination (kobo)
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/topup/callback`,
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to initialize payment');
    }

    res.json({ success: true, data: data.data });
  } catch (err) {
    next(err);
  }
});

// 2. Webhook to receive payment success
app.post('/payments/webhook', async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const hash = crypto
      .createHmac('sha512', secret)
      .update((req as any).rawBody)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('[Payment] Invalid Paystack signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;

    // When a user successfully tops up their wallet
    if (event.event === 'charge.success') {
      const { customer, amount, authorization, reference } = event.data;

      const user = await prisma.user.findUnique({ where: { email: customer.email } });

      if (user) {
        try {
          await prisma.$transaction(async (tx) => {
            // Add funds to wallet and save auth code for auto-billing
            await tx.user.update({
              where: { id: user.id },
              data: {
                walletCents: { increment: amount },
                paystackAuthCode: authorization.authorization_code,
              },
            });

            await tx.payment.create({
              data: {
                userId: user.id,
                amountCents: amount,
                currency: 'NGN',
                status: 'success',
                provider: 'paystack',
                providerRef: reference,
              },
            });
          });
          logger.info(
            { userId: user.id, amount },
            '[Payment] Wallet topped up via Paystack webhook',
          );
        } catch (dbErr: any) {
          // P2002 is Prisma's Unique Constraint Violation error code
          if (dbErr.code === 'P2002' && dbErr.meta?.target?.includes('provider_ref')) {
            logger.info(
              { reference },
              '[Payment] Ignored duplicate Paystack webhook (idempotency)',
            );
          } else {
            throw dbErr;
          }
        }
      }
    }

    // Acknowledge receipt to Paystack
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, '[Payment] Webhook processing failed');
    res.sendStatus(500);
  }
});

// 3. Get Payment Methods
app.get('/payments/methods', jwtGuard, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return a mocked object if they have an auth code, since we don't store full card details
    const methods = user.paystackAuthCode ? [{
      id: 'paystack_saved_card',
      brand: 'Card',
      last4: '****', // Paystack doesn't return this in standard initialization, we just know it's a card.
      isDefault: true
    }] : [];

    res.json({ success: true, data: methods });
  } catch (err) {
    next(err);
  }
});

// 4. Delete Payment Method
app.delete('/payments/methods', jwtGuard, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    
    await prisma.user.update({
      where: { id: userId },
      data: { paystackAuthCode: null }
    });

    res.json({ success: true, message: 'Payment method removed' });
  } catch (err) {
    next(err);
  }
});

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

// ── Payment Handler ───────────────────────────────────────────────────────────
export async function processPaymentCharge(
  event: KafkaPaymentChargeEvent & { _traceId?: string },
): Promise<void> {
  const { userId, amount: amountCents, rideId, _traceId } = event;
  const log = logger.child({ userId, rideId, amountCents, traceId: _traceId });

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
          status: 'failed',
          provider: 'wallet',
        },
      });

      // Emit failure so Notification + Ride services can handle it
      await publish(TOPICS.PAYMENT_RESULT, { 
        rideId, 
        userId, 
        userEmail: user.email, 
        status: 'failed', 
        ts: Date.now() 
      });

      throw new InsufficientBalanceError(amountCents, user.walletCents);
    }

    // Deduct from wallet
    await tx.user.update({
      where: { id: userId },
      data: { walletCents: { decrement: amountCents } },
    });

    await tx.payment.create({
      data: {
        userId,
        rideId,
        amountCents,
        currency: 'NGN',
        status: 'success',
        provider: 'wallet',
      },
    });

    log.info('[Payment] Wallet deduction successful');
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Emit success result
  await publish(TOPICS.PAYMENT_RESULT, { 
    rideId, 
    userId, 
    userEmail: user.email, 
    status: 'success', 
    ts: Date.now() 
  });
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

  registerCleanup('Postgres', () => prisma.$disconnect());
  registerCleanup('Redis', () => disconnectRedis());
  registerCleanup('Events Producer', () => disconnectProducer());
  registerCleanup('Events Consumer', () => consumer.disconnect());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, '[Payment Service] Ready');
  });
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { app };

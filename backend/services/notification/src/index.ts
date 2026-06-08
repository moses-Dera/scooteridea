// ─────────────────────────────────────────────────────────────────────────────
//  Notification Service — index.ts
//
//  Kafka consumer that dispatches Expo push notifications on ride + payment events.
//  Push token storage: Redis key `push_token:{userId}` (set by auth-service on login).
//  Swap sendPushNotification() for FCM by replacing the Expo call with
//  firebase-admin's messaging.send() — the rest of the service stays the same.
//
//  Bootstrap pattern mirrors auth-service / fleet-service.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import http    from 'http';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

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
} from '@ebike/core';
import { createConsumer, TOPICS } from '@ebike/kafka';
import { getRedisClient, disconnectRedis } from '@ebike/redis';

// ── App (health endpoint only) ────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.NOTIFICATION_PORT ?? process.env.PORT ?? 3007);

process.env.SERVICE_NAME = 'notification-service';

app.use(requestId);
app.use(httpLogger);
app.use(express.json());
app.use(healthRouter());
app.use(notFoundHandler);
app.use(errorHandler);

// ── Expo Client (singleton) ───────────────────────────────────────────────────
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

// ── Notification Types ────────────────────────────────────────────────────────
interface NotificationPayload {
  type?: string;
  userId?: string;
  rideId?: string;
  bikeId?: string;
  dockId?: string;
  fareCents?: number;
  status?: string;
}

// ── Token Helpers ─────────────────────────────────────────────────────────────
/** Retrieve the Expo push token for a user from Redis. Returns null if not found. */
async function getPushToken(userId: string): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.get(`push_token:${userId}`);
}

/** Remove a stale push token (DeviceNotRegistered error from Expo). */
async function deletePushToken(userId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(`push_token:${userId}`);
  logger.warn({ userId }, '[Notification] Removed stale push token');
}

// ── Push Delivery ─────────────────────────────────────────────────────────────
/**
 * Sends an Expo push notification to a single user.
 * - Looks up the token from Redis.
 * - Validates it is a real Expo push token.
 * - Handles DeviceNotRegistered by cleaning up the stale token.
 * - Never throws — all failures are logged and swallowed.
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  let token: string | null;
  try {
    token = await getPushToken(userId);
  } catch (err) {
    logger.warn({ err, userId }, '[Notification] Redis push token lookup failed');
    return;
  }

  if (!token) {
    logger.debug({ userId }, '[Notification] No push token registered — skipping delivery');
    return;
  }

  if (!Expo.isExpoPushToken(token)) {
    logger.warn({ userId, token }, '[Notification] Invalid Expo push token format — removing');
    await deletePushToken(userId);
    return;
  }

  const message: ExpoPushMessage = {
    to:    token,
    sound: 'default',
    title,
    body,
    data:  data ?? {},
  };

  try {
    const chunks  = expo.chunkPushNotifications([message]);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }

    // Check for DeviceNotRegistered errors
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await deletePushToken(userId);
        } else {
          logger.warn({ userId, error: ticket.details?.error, message: ticket.message }, '[Notification] Expo push error');
        }
      }
    }

    logger.info({ userId, title }, '[Notification] Push delivered');
  } catch (err) {
    logger.warn({ err, userId, title }, '[Notification] Expo push delivery failed');
  }
}

// ── Consumer ──────────────────────────────────────────────────────────────────
async function startConsumer() {
  const consumer = createConsumer('notification-consumer');

  await consumer.subscribe(
    [TOPICS.RIDE_STARTED, TOPICS.RIDE_ENDED, TOPICS.OPS_ALERT, TOPICS.PAYMENT_RESULT],
    async (payload: unknown) => {
      const p = payload as NotificationPayload;

      switch (p.type) {
        // ── Ops Alerts ────────────────────────────────────────────────────────
        case 'DOCK_FULL':
          logger.warn({ dockId: p.dockId }, '[Notification] Ops: dock full');
          break;

        case 'DOCK_EMPTY':
          logger.warn({ dockId: p.dockId }, '[Notification] Ops: dock empty');
          break;

        case 'LOW_BATTERY':
          if (p.userId) {
            await sendPushNotification(
              p.userId,
              '⚡ Low Battery',
              'Please return to a dock soon.',
              { type: 'LOW_BATTERY', bikeId: p.bikeId ?? '' },
            );
          }
          break;

        case 'ZONE_VIOLATION':
          if (p.userId) {
            await sendPushNotification(
              p.userId,
              '⚠️ Zone Warning',
              'You have entered a restricted zone.',
              { type: 'ZONE_VIOLATION' },
            );
          }
          break;

        // ── Payment result ────────────────────────────────────────────────────
        case 'failed':
          if (p.userId) {
            await sendPushNotification(
              p.userId,
              '💳 Payment Failed',
              'Your ride payment could not be processed. Please top up your wallet.',
              { type: 'PAYMENT_FAILED', rideId: p.rideId ?? '' },
            );
          }
          break;

        // ── Ride lifecycle (RIDE_STARTED / RIDE_ENDED) ────────────────────────
        default: {
          if (p.rideId && p.userId) {
            const isRideEnd = !!p.fareCents;
            await sendPushNotification(
              p.userId,
              isRideEnd ? '🏁 Ride Complete' : '🚴 Ride Started',
              isRideEnd
                ? `Your fare: ₦${((p.fareCents ?? 0) / 100).toFixed(2)}`
                : 'Your bike is unlocked — enjoy your ride!',
              { type: isRideEnd ? 'RIDE_RECEIPT' : 'RIDE_STARTED', rideId: p.rideId },
            );
          }
          break;
        }
      }
    },
  );

  return consumer;
}

// ── Health Probes ─────────────────────────────────────────────────────────────
registerProbe('kafka', async () => ({ status: 'ok' }), { critical: false });
registerProbe('redis', async () => {
  const redis = await getRedisClient();
  await redis.ping();
  return { status: 'ok' };
}, { critical: false }); // non-critical: push delivery degrades gracefully without Redis

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  // Connect Redis for push token lookup
  try {
    await getRedisClient();
    logger.info('[Notification] Redis connected');
  } catch (err) {
    logger.warn({ err }, '[Notification] Redis unavailable — push delivery will be degraded');
  }

  let consumer: Awaited<ReturnType<typeof startConsumer>>;

  try {
    consumer = await startConsumer();
    logger.info('[Notification] Kafka consumer active');
  } catch (err) {
    logger.fatal({ err }, '[Notification] Kafka consumer startup failed');
    process.exit(1);
  }

  registerCleanup('Kafka Consumer', () => consumer.disconnect());
  registerCleanup('Redis',          () => disconnectRedis());

  const server = http.createServer(app);
  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[Notification Service] Ready');
  });
}

bootstrap();

export default app;

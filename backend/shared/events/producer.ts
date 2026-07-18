import Redis from 'ioredis';
import type {
  KafkaFleetTelemetryEvent,
  KafkaDockStatusEvent,
  KafkaRideStartedEvent,
  KafkaRideEndedEvent,
  KafkaPaymentChargeEvent,
  KafkaPaymentResultEvent,
  KafkaOpsAlertEvent,
  KafkaFleetCommandEvent,
} from '@ebike/types';

// ── Topic Registry ────────────────────────────────────────────────────────────
export const TOPICS = {
  FLEET_TELEMETRY: 'fleet.telemetry',
  DOCK_STATUS: 'dock.status',
  RIDE_STARTED: 'ride.started',
  RIDE_ENDED: 'ride.ended',
  PAYMENT_CHARGE: 'payment.charge',
  PAYMENT_RESULT: 'payment.result',
  OPS_ALERT: 'ops.alert',
  FLEET_COMMAND: 'fleet.command',
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
} as const;

// ── Redis instance (singleton) ────────────────────────────────────────────────
let redisClient: Redis | null = null;

export async function connectProducer(): Promise<void> {
  if (redisClient) return;
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  console.log('[Redis Publisher] Connected');
}

export async function disconnectProducer(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

import { getTraceId } from '@ebike/core';

// ── Generic publish ───────────────────────────────────────────────────────────
export async function publish<T extends object>(
  topic: string,
  payload: T,
  key?: string,
): Promise<void> {
  if (!redisClient) throw new Error('Redis publisher not connected');
  const traceId = getTraceId();
  await redisClient.publish(
    topic,
    JSON.stringify({ ...payload, ts: Date.now(), _traceId: traceId }),
  );
}

// ── Typed publishers ──────────────────────────────────────────────────────────
export const kafka = {
  fleetTelemetry: (e: KafkaFleetTelemetryEvent) => publish(TOPICS.FLEET_TELEMETRY, e, e.bikeId),
  dockStatus: (e: KafkaDockStatusEvent) => publish(TOPICS.DOCK_STATUS, e, e.dockId),
  rideStarted: (e: KafkaRideStartedEvent) => publish(TOPICS.RIDE_STARTED, e, e.rideId),
  rideEnded: (e: KafkaRideEndedEvent) => publish(TOPICS.RIDE_ENDED, e, e.rideId),
  paymentCharge: (e: KafkaPaymentChargeEvent) => publish(TOPICS.PAYMENT_CHARGE, e, e.rideId),
  paymentResult: (e: KafkaPaymentResultEvent) => publish(TOPICS.PAYMENT_RESULT, e, e.rideId),
  opsAlert: (e: KafkaOpsAlertEvent) => publish(TOPICS.OPS_ALERT, e),
  fleetCommand: (e: KafkaFleetCommandEvent) => publish(TOPICS.FLEET_COMMAND, e, e.bikeId),
  supportTicketCreated: (e: { ticketId: string; userId: string; subject: string }) =>
    publish(TOPICS.SUPPORT_TICKET_CREATED, e),
};

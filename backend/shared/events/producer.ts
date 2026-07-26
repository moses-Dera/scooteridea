import amqp from 'amqplib';
import type {
  KafkaFleetTelemetryEvent,
  KafkaDockStatusEvent,
  KafkaRideStartedEvent,
  KafkaRideEndedEvent,
  KafkaPaymentChargeEvent,
  KafkaPaymentResultEvent,
  KafkaOpsAlertEvent,
  KafkaFleetCommandEvent,
  KafkaUserRegisteredEvent,
  KafkaPasswordResetRequestedEvent,
  KafkaTwoFactorOtpEvent,
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
  USER_REGISTERED: 'user.registered',
  PASSWORD_RESET_REQUESTED: 'password.reset.requested',
  TWO_FACTOR_OTP_REQUESTED: 'two.factor.otp.requested',
} as const;

// ── RabbitMQ instance (singleton) ────────────────────────────────────────────────
let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;
const EXCHANGE = 'scooterfy_events';

export async function connectProducer(): Promise<void> {
  if (channel) return;
  
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    
    connection.on('error', (err) => {
      console.error('[RabbitMQ Publisher] Connection error', err);
      channel = null;
      connection = null;
    });
    connection.on('close', () => {
      console.error('[RabbitMQ Publisher] Connection closed');
      channel = null;
      connection = null;
    });
    console.log('[RabbitMQ Publisher] Connected');
  } catch (error) {
    console.error('[RabbitMQ Publisher] Failed to connect', error);
    throw error;
  }
}

export async function disconnectProducer(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

import { getTraceId } from '@ebike/core';

// ── Generic publish ───────────────────────────────────────────────────────────
export async function publish<T extends object>(
  topic: string,
  payload: T,
  key?: string,
): Promise<void> {
  if (!channel) {
    // Attempt to reconnect once if disconnected
    console.warn('[RabbitMQ Publisher] Not connected. Attempting to reconnect...');
    await connectProducer();
    if (!channel) throw new Error('RabbitMQ publisher not connected');
  }
  
  const traceId = getTraceId();
  const messageBuffer = Buffer.from(JSON.stringify({ ...payload, ts: Date.now(), _traceId: traceId }));
  
  channel.publish(EXCHANGE, topic, messageBuffer, { persistent: true });
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
  userRegistered: (e: KafkaUserRegisteredEvent) => publish(TOPICS.USER_REGISTERED, e, e.userId),
  passwordResetRequested: (e: KafkaPasswordResetRequestedEvent) =>
    publish(TOPICS.PASSWORD_RESET_REQUESTED, e, e.userId),
  twoFactorOtpRequested: (e: KafkaTwoFactorOtpEvent) =>
    publish(TOPICS.TWO_FACTOR_OTP_REQUESTED, e, e.userId),
};

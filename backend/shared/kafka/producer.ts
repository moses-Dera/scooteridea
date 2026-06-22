import { Kafka, Producer, Partitioners } from 'kafkajs';
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
  FLEET_TELEMETRY:  'fleet.telemetry',
  DOCK_STATUS:      'dock.status',
  RIDE_STARTED:     'ride.started',
  RIDE_ENDED:       'ride.ended',
  PAYMENT_CHARGE:   'payment.charge',
  PAYMENT_RESULT:   'payment.result',
  OPS_ALERT:        'ops.alert',
  FLEET_COMMAND:    'fleet.command',
} as const;

// ── Kafka instance (singleton) ────────────────────────────────────────────────
let producer: Producer | null = null;

function getKafka() {
  return new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'ebike-service',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  });
}

export async function connectProducer(): Promise<void> {
  if (producer) return;
  producer = getKafka().producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });
  await producer.connect();
  console.log('[Kafka Producer] Connected');
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}

// ── Generic publish ───────────────────────────────────────────────────────────
export async function publish<T extends object>(
  topic: string,
  payload: T,
  key?: string,
): Promise<void> {
  if (!producer) throw new Error('Kafka producer not connected');
  await producer.send({
    topic,
    messages: [{ key, value: JSON.stringify({ ...payload, ts: Date.now() }) }],
  });
}

// ── Typed publishers ──────────────────────────────────────────────────────────
export const kafka = {
  fleetTelemetry:  (e: KafkaFleetTelemetryEvent)  => publish(TOPICS.FLEET_TELEMETRY,  e, e.bikeId),
  dockStatus:      (e: KafkaDockStatusEvent)       => publish(TOPICS.DOCK_STATUS,      e, e.dockId),
  rideStarted:     (e: KafkaRideStartedEvent)      => publish(TOPICS.RIDE_STARTED,     e, e.rideId),
  rideEnded:       (e: KafkaRideEndedEvent)        => publish(TOPICS.RIDE_ENDED,       e, e.rideId),
  paymentCharge:   (e: KafkaPaymentChargeEvent)    => publish(TOPICS.PAYMENT_CHARGE,   e, e.rideId),
  paymentResult:   (e: KafkaPaymentResultEvent)    => publish(TOPICS.PAYMENT_RESULT,   e, e.rideId),
  opsAlert:        (e: KafkaOpsAlertEvent)         => publish(TOPICS.OPS_ALERT,        e),
  fleetCommand:    (e: KafkaFleetCommandEvent)     => publish(TOPICS.FLEET_COMMAND,    e, e.bikeId),
};

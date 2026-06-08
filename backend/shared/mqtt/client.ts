import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import type { BikeCommandPayload } from '@ebike/types';

let client: MqttClient | null = null;

/** Connect (or return the cached client). Safe to call multiple times. */
export function getMqttClient(): MqttClient {
  if (!client) {
    const options: IClientOptions = {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: `ebike-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 3000,
    };
    client = mqtt.connect(process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883', options);

    client.on('connect', () => console.log('[MQTT] Connected to broker'));
    client.on('error', (err) => console.error('[MQTT] Error', err));
    client.on('reconnect', () => console.log('[MQTT] Reconnecting…'));
  }
  return client;
}

/** Publish a QoS-1 bike command. */
export async function publishBikeCommand(
  bikeId: string,
  payload: Omit<BikeCommandPayload, 'ts'>,
): Promise<void> {
  const c = getMqttClient();
  const topic = `bikes/${bikeId}/commands`;
  const message = JSON.stringify({ ...payload, ts: Date.now() });

  return new Promise((resolve, reject) => {
    c.publish(topic, message, { qos: 1 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/** Subscribe to a topic with a typed handler. */
export function subscribeToTopic(
  topic: string,
  handler: (topic: string, message: string) => void,
): void {
  const c = getMqttClient();
  c.subscribe(topic, { qos: 1 }, (err) => {
    if (err) console.error(`[MQTT] Subscribe error (${topic})`, err);
  });
  c.on('message', (t, payload) => {
    if (t === topic || mqttTopicMatch(topic, t)) {
      handler(t, payload.toString());
    }
  });
}

/** Naïve MQTT wildcard matcher ('+' single-level, '#' multi-level). */
function mqttTopicMatch(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '#') return true;
    if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) return false;
  }
  return patternParts.length === topicParts.length;
}

/** Typed command helper — mirrors BikeCommander from architecture doc. */
export const bikeCommander = {
  unlock: (bikeId: string, rideId: string) =>
    publishBikeCommand(bikeId, { command: 'UNLOCK', rideId }),

  lock: (bikeId: string) =>
    publishBikeCommand(bikeId, { command: 'LOCK' }),

  alarm: (bikeId: string) =>
    publishBikeCommand(bikeId, { command: 'ALARM' }),

  disable: (bikeId: string, reason: string) =>
    publishBikeCommand(bikeId, { command: 'DISABLE', reason }),

  speedLimit: (bikeId: string, kmh: number) =>
    publishBikeCommand(bikeId, { command: 'SPEED_LIMIT', value: kmh }),
};

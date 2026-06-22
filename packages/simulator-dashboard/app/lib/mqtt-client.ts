import mqtt from 'mqtt';

export interface BikeData {
  bike_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  battery_pct: number;
  lock_status: 'LOCKED' | 'UNLOCKED';
  docked_at: string | null;
  charging: boolean;
  timestamp: string;
}

export interface DockData {
  dock_id: string;
  name: string;
  lat: number;
  lng: number;
  total_slots: number;
  available_slots: number;
  slots: Array<{
    slot: number;
    bike_id: string | null;
    charging: boolean;
    battery_pct: number | null;
  }>;
  timestamp: string;
}

let client: mqtt.MqttClient | null = null;

export function connectMQTT(brokerUrl: string = 'mqtt://localhost:1883'): Promise<mqtt.MqttClient> {
  return new Promise((resolve, reject) => {
    if (client && client.connected) {
      resolve(client);
      return;
    }

    client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      resolve(client!);
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
      reject(err);
    });

    setTimeout(() => {
      if (!client?.connected) {
        reject(new Error('Connection timeout'));
      }
    }, 35000);
  });
}

export function publishCommand(bikeId: string, command: string): void {
  if (!client?.connected) {
    console.error('MQTT not connected');
    return;
  }
  client.publish(`bikes/${bikeId}/commands`, command);
}

export function getMQTTClient(): mqtt.MqttClient | null {
  return client;
}

export function disconnectMQTT(): void {
  if (client) {
    client.end();
    client = null;
  }
}

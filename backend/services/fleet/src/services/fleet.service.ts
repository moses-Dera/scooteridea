import { getMqttClient, subscribeToTopic, bikeCommander } from '@ebike/mqtt';
import { getRedisClient, geoAdd, redisGetJson, redisSetJson, redisPushWaypoint } from '@ebike/redis';
import { kafka } from '@ebike/events';
import { prisma } from '@ebike/db';
import { logger } from '@ebike/core';
import type {
  BikeTelemetryPayload,
  BikeStatus,
} from '@ebike/types';

export class FleetService {
  /** Subscribe to all MQTT bike/dock topics. */
  static async startMqttIngestion() {
    getMqttClient(); // ensure connection

    subscribeToTopic('bikes/+/telemetry', async (topic, raw) => {
      const bikeId = topic.split('/')[1];
      const payload = JSON.parse(raw) as BikeTelemetryPayload;
      await FleetService.handleBikeTelemetry(bikeId, payload);
    });

    subscribeToTopic('bikes/+/alerts', async (topic, raw) => {
      const bikeId = topic.split('/')[1];
      await FleetService.handleBikeAlert(bikeId, JSON.parse(raw));
    });

    logger.info('[Fleet] MQTT subscriptions active');
  }

  /**
   * Core telemetry handler — follows exact spec from backend_architecture.md §3.2
   */
  static async handleBikeTelemetry(
    bikeId: string,
    payload: BikeTelemetryPayload,
  ): Promise<void> {
    const { lat, lng, battery_pct, speed_kmh, lock_status, docked_at } = payload;

    // 1. Write live location to Redis (TTL 30s — stale auto-purge)
    await redisSetJson(
      `bike:${bikeId}:location`,
      { lat, lng, battery_pct, speed_kmh },
      30,
    );

    // 2. Update geospatial index
    await geoAdd('fleet:available', lng, lat, bikeId);

    // 3. Derive status
    const status: BikeStatus = docked_at
      ? 'charging'
      : lock_status === 'LOCKED'
        ? 'available'
        : 'in_use';

    const redis = await getRedisClient();
    await redis.set(`bike:${bikeId}:status`, status);

    // 4. Record GPS waypoint for active rides (distance calculation at ride-end)
    if (status === 'in_use') {
      const sessionRaw = await redis.get(`bike:${bikeId}:ride`);
      if (sessionRaw) {
        const { rideId } = JSON.parse(sessionRaw) as { rideId: string };
        await redisPushWaypoint(rideId, lat, lng).catch(() => { /* non-critical */ });
      }
    }

    // 5. Check geofences (PostGIS)
    await FleetService.checkGeofence(bikeId, lat, lng);

    // 6. Emit to Redis event bus (fan-out: WS Hub + DB Writer)
    await kafka.fleetTelemetry({
      bikeId,
      lat,
      lng,
      batteryPct: battery_pct,
      status,
      ts: Date.now(),
    });

    // 7. Low battery alert
    if (battery_pct <= 15) {
      await kafka.opsAlert({
        type: 'LOW_BATTERY',
        bikeId,
        ts: Date.now(),
      });
    }
  }

  static async handleBikeAlert(bikeId: string, payload: { type: string }) {
    logger.warn({ bikeId, alertType: payload.type }, '[Fleet] Bike alert received');
    await kafka.opsAlert({ type: 'BIKE_OFFLINE', bikeId, ts: Date.now() });
  }

  /**
   * PostGIS geofence check — enforces speed caps and no-ride zones.
   */
  static async checkGeofence(bikeId: string, lat: number, lng: number): Promise<void> {
    const zones = await prisma.$queryRaw<
      { id: string; type: string; speed_cap: number | null }[]
    >`
      SELECT id, type, speed_cap
      FROM geofences
      WHERE ST_Contains(
        boundary::geometry,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    for (const zone of zones) {
      if (zone.type === 'no_ride') {
        await bikeCommander.disable(bikeId, 'NO_RIDE_ZONE');
        await kafka.opsAlert({ type: 'ZONE_VIOLATION', bikeId, lat, lng, ts: Date.now() });
      }
      if (zone.type === 'slow' && zone.speed_cap) {
        await bikeCommander.speedLimit(bikeId, zone.speed_cap);
      }
    }
  }

  /** Get all bikes from Redis (live state). */
  static async getAllBikes() {
    const redis = await getRedisClient();
    const bikeKeys = await redis.keys('bike:*:status');
    const bikes = await Promise.all(
      bikeKeys.map(async (key) => {
        const bikeId = key.split(':')[1];
        const [status, location] = await Promise.all([
          redis.get(`bike:${bikeId}:status`),
          redisGetJson<{ lat: number; lng: number; battery_pct: number; speed_kmh: number }>(
            `bike:${bikeId}:location`,
          ),
        ]);
        return { bikeId, status, ...location };
      }),
    );
    return bikes;
  }

  /** Find nearby bikes using Redis Geospatial (Replacing the matching-service) */
  static async getNearbyBikes(lat: number, lng: number, radiusKm: number = 2) {
    const redis = await getRedisClient();
    // GEORADIUS returns closest bikes first.
    const bikes = await redis.geoSearch('fleet:available', { longitude: lng, latitude: lat }, { radius: radiusKm, unit: 'km' }, { SORT: 'ASC' });
    
    const availableBikes = [];
    for (const bikeId of bikes as string[]) {
      const status = await redis.get(`bike:${bikeId}:status`);
      if (status === 'available') {
        const location = await redisGetJson<{ lat: number; lng: number; battery_pct: number; speed_kmh: number }>(`bike:${bikeId}:location`);
        // Only show bikes to riders if battery > 15%
        if (location && location.battery_pct > 15) {
           availableBikes.push({ bikeId, ...location });
        }
      }
    }
    return availableBikes;
  }

  /** Get recent system alerts (stored in Redis as a list) */
  static async getAlerts(limit: number = 10) {
    try {
      const redis = await getRedisClient();
      const raw = await redis.lRange('ops:alerts', 0, limit - 1);
      return raw.map((r) => JSON.parse(r));
    } catch (err) {
      logger.warn({ err }, '[Fleet] Failed to fetch alerts from Redis');
      return [];
    }
  }

  /** Get maintenance issues (stored in Redis) */
  static async getMaintenance(_status: string = 'open') {
    try {
      const redis = await getRedisClient();
      const raw = await redis.lRange('ops:maintenance', 0, 49);
      return raw.map((r) => JSON.parse(r));
    } catch (err) {
      logger.warn({ err }, '[Fleet] Failed to fetch maintenance from Redis');
      return [];
    }
  }
}

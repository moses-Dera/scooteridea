import { getMqttClient, subscribeToTopic, bikeCommander } from '@ebike/mqtt';
import { IoTParser } from './iot.parser';
import {
  getRedisClient,
  geoAdd,
  redisGetJson,
  redisSetJson,
  redisPushWaypoint,
} from '@ebike/redis';
import { kafka } from '@ebike/events';
import { prisma } from '@ebike/db';
import { logger } from '@ebike/core';
import type { BikeTelemetryPayload, BikeStatus } from '@ebike/types';
import { z } from 'zod';

const BikeTelemetrySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  battery_pct: z.number().min(0).max(100),
  speed_kmh: z.number().min(0),
  lock_status: z.enum(['LOCKED', 'UNLOCKED']),
  docked_at: z.string().nullable().optional(),
});

const DemoSpawnSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  count: z.number().int().min(1).max(100).optional(),
  radius: z.number().min(0.1).max(50).optional(),
});

const sanitize = (val: string) => String(val).replace(/[\r\n\t]/g, ' ');

export class FleetService {
  /** Subscribe to all MQTT bike/dock topics. */
  static async startMqttIngestion() {
    getMqttClient(); // ensure connection

    subscribeToTopic('bikes/+/telemetry', async (topic, raw) => {
      try {
        const bikeId = sanitize(topic.split('/')[1]);
        const parsed = BikeTelemetrySchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          logger.warn({ bikeId, errors: parsed.error.issues }, '[Fleet] Invalid telemetry — skipped');
          return;
        }
        await FleetService.handleBikeTelemetry(bikeId, parsed.data as BikeTelemetryPayload);
      } catch (err) {
        logger.error({ err, topic }, '[Fleet] Failed to process bike telemetry');
      }
    });

    subscribeToTopic('bikes/+/alerts', async (topic, raw) => {
      try {
        const bikeId = sanitize(topic.split('/')[1]);
        const data = JSON.parse(raw);
        if (typeof data?.type !== 'string') return;
        await FleetService.handleBikeAlert(bikeId, { type: sanitize(data.type) });
      } catch (err) {
        logger.error({ err, topic }, '[Fleet] Failed to process bike alert');
      }
    });

    subscribeToTopic('iot/trackers/raw', async (topic, raw) => {
      try {
        const decoded = IoTParser.parseHexPayload(raw.toString());
        if (decoded) {
          const parsed = BikeTelemetrySchema.safeParse(decoded.payload);
          if (!parsed.success) return;
          await FleetService.handleBikeTelemetry(decoded.bikeId, parsed.data as BikeTelemetryPayload);
        }
      } catch (err) {
        logger.error({ err }, '[Fleet] Failed to ingest physical bike payload');
      }
    });

    subscribeToTopic('system/demo/spawn', async (topic, raw) => {
      try {
        const parsed = DemoSpawnSchema.safeParse(JSON.parse(raw.toString()));
        if (!parsed.success) {
          logger.warn({ errors: parsed.error.issues }, '[Fleet] Invalid demo spawn — skipped');
          return;
        }
        const { lat, lng, count, radius } = parsed.data;
        for (let i = 0; i < (count || 10); i++) {
          const newId = `BK-${Math.floor(Math.random() * 90000) + 10000}`;
          const bLat = lat + (Math.random() - 0.5) * ((radius || 2) * 0.01);
          const bLng = lng + (Math.random() - 0.5) * ((radius || 2) * 0.01);
          await FleetService.handleBikeTelemetry(newId, {
            lat: bLat, lng: bLng, battery_pct: 100, speed_kmh: 0, docked_at: null, lock_status: 'LOCKED',
          });
        }
        logger.info(`[Fleet] Spawned ${count} demo bikes near ${lat}, ${lng}`);
      } catch (err) {
        logger.error({ err }, '[Fleet] Failed to spawn demo bikes');
      }
    });

    logger.info('[Fleet] MQTT subscriptions active');
  }

  /**
   * Core telemetry handler — follows exact spec from backend_architecture.md §3.2
   */
  static async handleBikeTelemetry(bikeId: string, payload: BikeTelemetryPayload): Promise<void> {
    const { lat, lng, battery_pct, speed_kmh, lock_status, docked_at } = payload;

    // 1. Write live location to Redis (TTL 30s — stale auto-purge)
    await redisSetJson(
      `bike:${bikeId}:location`,
      { lat, lng, battery_pct, speed_kmh, lock_status },
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

    // 3.5. Record Location Trail (Breadcrumbs)
    // We push the current location to a list and keep only the latest 100 points
    const trailKey = `bike:${bikeId}:trail`;
    await redis.lPush(trailKey, JSON.stringify({ lat, lng, ts: Date.now() }));
    await redis.lTrim(trailKey, 0, 99); // Keep exactly 100 points maximum

    // 4. Record GPS waypoint for active rides (distance calculation at ride-end)
    if (status === 'in_use') {
      const sessionRaw = await redis.get(`bike:${bikeId}:ride`);
      if (sessionRaw) {
        const { rideId } = JSON.parse(sessionRaw) as { rideId: string };
        await redisPushWaypoint(rideId, lat, lng).catch(() => {
          /* non-critical */
        });
      }
    }

    // 5. Check geofences (PostGIS)
    const zoneIds = await FleetService.checkGeofence(bikeId, lat, lng);

    // 6. Emit to Redis event bus (fan-out: WS Hub + DB Writer)
    await kafka.fleetTelemetry({
      bikeId,
      lat,
      lng,
      batteryPct: battery_pct,
      status,
      lock_status,
      zoneIds,
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
   * PostGIS geofence check — enforces speed caps, no-ride zones, and tracks zone transitions.
   */
  static async checkGeofence(bikeId: string, lat: number, lng: number): Promise<string[]> {
    const zones = await prisma.$queryRaw<
      { id: string; name: string; type: string; speed_cap: number | null }[]
    >`
      SELECT id, name, type, speed_cap
      FROM geofences
      WHERE ST_Contains(
        ST_SetSRID(ST_GeomFromGeoJSON(boundary::text), 4326),
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    const currentZoneIds = zones.map((z) => z.id);
    const redis = await getRedisClient();
    const prevZonesRaw = await redis.get(`bike:${bikeId}:zones`);
    const prevZoneIds: string[] = prevZonesRaw ? JSON.parse(prevZonesRaw) : [];

    // Track Enters
    for (const zone of zones) {
      if (!prevZoneIds.includes(zone.id)) {
        logger.info(`Bike ${sanitize(bikeId)} entered zone ${sanitize(zone.name)}`);

        await prisma.zoneTransition.create({
          data: {
            bikeId,
            zoneId: zone.id,
            type: 'ENTER',
            lat,
            lng,
          },
        });

        await kafka.opsAlert({
          type: 'ZONE_TRANSITION',
          bikeId,
          message: `Bike ${bikeId} entered zone: ${zone.name}`,
          ts: Date.now(),
        });
      }

      if (zone.type === 'no_ride') {
        await bikeCommander.disable(bikeId, 'NO_RIDE_ZONE');
        await kafka.opsAlert({ type: 'ZONE_VIOLATION', bikeId, lat, lng, ts: Date.now() });
      }
      if (zone.type === 'slow' && zone.speed_cap) {
        await bikeCommander.speedLimit(bikeId, zone.speed_cap);
      }
    }

    // Track Exits
    for (const prevZoneId of prevZoneIds) {
      if (!currentZoneIds.includes(prevZoneId)) {
        logger.info(`Bike ${sanitize(bikeId)} left zone ${sanitize(prevZoneId)}`);

        await prisma.zoneTransition.create({
          data: {
            bikeId,
            zoneId: prevZoneId,
            type: 'EXIT',
            lat,
            lng,
          },
        });

        await kafka.opsAlert({
          type: 'ZONE_TRANSITION',
          bikeId,
          message: `Bike ${bikeId} left zone`,
          ts: Date.now(),
        });
      }
    }

    // Save current state for next tick
    await redis.set(`bike:${bikeId}:zones`, JSON.stringify(currentZoneIds));

    return currentZoneIds;
  }

  /** Get all bikes from Redis (live state). */
  static async getAllBikes() {
    const redis = await getRedisClient();
    const bikeKeys = await redis.keys('bike:*:status');
    const bikes = await Promise.all(
      bikeKeys.map(async (key) => {
        const bikeId = key.split(':')[1];
        const [status, location, zonesRaw] = await Promise.all([
          redis.get(`bike:${bikeId}:status`),
          redisGetJson<{
            lat: number;
            lng: number;
            battery_pct: number;
            speed_kmh: number;
            lock_status?: string;
          }>(`bike:${bikeId}:location`),
          redis.get(`bike:${bikeId}:zones`),
        ]);
        return {
          id: bikeId,
          bikeId,
          status,
          ...(location || {}),
          lock_status: location?.lock_status || 'LOCKED',
      const zoneIds: string[] = zonesRaw ? (() => { try { return JSON.parse(zonesRaw); } catch { return []; } })() : [];
        };
      }),
    );
    // Filter out bikes whose location expired (TTL passed) to prevent invalid GeoJSON
    return bikes.filter((b) => b.lat !== undefined && b.lng !== undefined);
  }

  /** Find nearby bikes using Redis Geospatial (Replacing the matching-service) */
  static async getNearbyBikes(lat: number, lng: number, radiusKm: number = 2) {
    const redis = await getRedisClient();
    // GEORADIUS returns closest bikes first.
    const bikes = await redis.geoSearch(
      'fleet:available',
      { longitude: lng, latitude: lat },
      { radius: radiusKm, unit: 'km' },
      { SORT: 'ASC' },
    );

    const availableBikes = [];
    for (const bikeId of bikes as string[]) {
      const status = await redis.get(`bike:${bikeId}:status`);
      if (status === 'available') {
        const location = await redisGetJson<{
          lat: number;
          lng: number;
          battery_pct: number;
          speed_kmh: number;
          lock_status?: string;
        }>(`bike:${bikeId}:location`);
        // Only show bikes to riders if battery > 15%
        if (location && location.battery_pct > 15) {
          availableBikes.push({
            bikeId,
            ...location,
            lock_status: location.lock_status || 'LOCKED',
          });
        }
      }
    }
    return availableBikes;
  }

  /** Find nearby docks using PostGIS from Postgres database */
  static async getNearbyDocks(lat: number, lng: number, radiusKm: number = 5) {
    // We use ST_DWithin on the raw coordinates.
    // radiusKm * 1000 converts km to meters which ST_DWithin expects for geography.
    const docks = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        available_slots: number;
        distance: number;
        lat: number;
        lng: number;
      }[]
    >`
      SELECT 
        id, 
        name, 
        available_slots, 
        location_lat as lat,
        location_lng as lng,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
        ) / 1000.0 AS distance
      FROM docks
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
        ${radiusKm * 1000}::float8
      )
      ORDER BY distance ASC
    `;

    return docks.map((d) => ({
      id: d.id,
      name: d.name,
      availableSlots: d.available_slots,
      lat: d.lat,
      lng: d.lng,
      distanceKm: Number(d.distance).toFixed(2),
    }));
  }

  /** Get all docks from Postgres (with their connected bikes if needed) */
  static async getAllDocks() {
    const docks = await prisma.dock.findMany({
      include: {
        bikes: {
          select: { id: true, status: true, batteryPct: true },
        },
      },
    });

    return docks.map((d) => ({
      id: d.id,
      name: d.name,
      location: `${d.locationLat.toFixed(4)}, ${d.locationLng.toFixed(4)}`,
      lat: d.locationLat,
      lng: d.locationLng,
      total_slots: d.totalSlots,
      available_slots: d.availableSlots,
      // Map bikes into "slots" so the UI grid works seamlessly
      slots: Array.from({ length: d.totalSlots }).map((_, i) => {
        const bike = d.bikes[i];
        return {
          id: `${d.id}-s${i + 1}`,
          bike_id: bike?.id || null,
          charging: !!bike && bike.batteryPct < 90, // mock charging status
          available: !bike,
        };
      }),
    }));
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

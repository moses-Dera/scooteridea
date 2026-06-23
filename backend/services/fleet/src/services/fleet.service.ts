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

    // 3.5. Record Location Trail (Breadcrumbs)
    // We push the current location to a list and keep only the latest 100 points
    const trailKey = `bike:${bikeId}:trail`;
    await redis.lpush(trailKey, JSON.stringify({ lat, lng, ts: Date.now() }));
    await redis.ltrim(trailKey, 0, 99); // Keep exactly 100 points maximum

    // 4. Record GPS waypoint for active rides (distance calculation at ride-end)
    if (status === 'in_use') {
      const sessionRaw = await redis.get(`bike:${bikeId}:ride`);
      if (sessionRaw) {
        const { rideId } = JSON.parse(sessionRaw) as { rideId: string };
        await redisPushWaypoint(rideId, lat, lng).catch(() => { /* non-critical */ });
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
        boundary::geometry,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    const currentZoneIds = zones.map(z => z.id);
    const redis = await getRedisClient();
    const prevZonesRaw = await redis.get(`bike:${bikeId}:zones`);
    const prevZoneIds: string[] = prevZonesRaw ? JSON.parse(prevZonesRaw) : [];

    // Track Enters
    for (const zone of zones) {
      if (!prevZoneIds.includes(zone.id)) {
        logger.info(`Bike ${bikeId} entered zone ${zone.name}`);
        
        await prisma.zoneTransition.create({
          data: {
            bikeId,
            zoneId: zone.id,
            type: 'ENTER',
            lat,
            lng
          }
        });

        await kafka.opsAlert({ 
          type: 'ZONE_TRANSITION', 
          bikeId, 
          message: `Bike ${bikeId} entered zone: ${zone.name}`,
          ts: Date.now() 
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
        logger.info(`Bike ${bikeId} left zone ${prevZoneId}`);
        
        await prisma.zoneTransition.create({
          data: {
            bikeId,
            zoneId: prevZoneId,
            type: 'EXIT',
            lat,
            lng
          }
        });

        await kafka.opsAlert({ 
          type: 'ZONE_TRANSITION', 
          bikeId, 
          message: `Bike ${bikeId} left zone`,
          ts: Date.now() 
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
          redisGetJson<{ lat: number; lng: number; battery_pct: number; speed_kmh: number }>(
            `bike:${bikeId}:location`,
          ),
          redis.get(`bike:${bikeId}:zones`)
        ]);
        return { 
          bikeId, 
          status, 
          ...location,
          zoneIds: zonesRaw ? JSON.parse(zonesRaw) : []
        };
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

  /** Find nearby docks using PostGIS from Postgres database */
  static async getNearbyDocks(lat: number, lng: number, radiusKm: number = 5) {
    // We use ST_DWithin on the raw coordinates. 
    // radiusKm * 1000 converts km to meters which ST_DWithin expects for geography.
    const docks = await prisma.$queryRaw<
      { id: string; name: string; available_slots: number; distance: number; lat: number; lng: number }[]
    >`
      SELECT 
        id, 
        name, 
        available_slots, 
        location_lat as lat,
        location_lng as lng,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000.0 AS distance
      FROM docks
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
      ORDER BY distance ASC
    `;
    
    return docks.map(d => ({
      id: d.id,
      name: d.name,
      availableSlots: d.available_slots,
      lat: d.lat,
      lng: d.lng,
      distanceKm: Number(d.distance).toFixed(2)
    }));
  }

  /** Get all docks from Postgres (with their connected bikes if needed) */
  static async getAllDocks() {
    const docks = await prisma.dock.findMany({
      include: {
        bikes: {
          select: { id: true, status: true, batteryPct: true }
        }
      }
    });

    return docks.map(d => ({
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
          id: `${d.id}-s${i+1}`,
          bike_id: bike?.id || null,
          charging: !!bike && bike.batteryPct < 90, // mock charging status
          available: !bike
        };
      })
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

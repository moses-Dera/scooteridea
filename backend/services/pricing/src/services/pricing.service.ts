import { getRedisClient, geoSearch } from '@ebike/redis';
import Geohash from 'ngeohash';
import { prisma } from '@ebike/db';

export class PricingService {
  /** Helper to get global system configuration */
  static async getConfig() {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 'global' } });
    }
    return {
      baseFare: config.unlockFeeCents / 100,
      perMinute: config.perMinuteCents / 100,
      perKm: config.perKmCents / 100,
    };
  }
  /**
   * Recalculate surge multipliers for all active demand cells.
   * Mirrors backend_architecture.md §3.5.
   */
  static async recalculateSurge(): Promise<void> {
    const redis = await getRedisClient();
    const keys = await redis.keys('geohash:demand:*');

    for (const key of keys) {
      const geohash = key.split(':')[2];
      const demand = parseInt((await redis.get(key)) ?? '0', 10);

      // Count available bikes in cell (simplified: use total for now)
      const supply = await redis.zCard('fleet:available');

      const ratio = supply / Math.max(demand, 1);
      const multiplier = ratio > 2.0 ? 1.0 : ratio > 1.0 ? 1.2 : ratio > 0.5 ? 1.5 : 2.0;

      await redis.setEx(`geohash:surge:${geohash}`, 120, multiplier.toString());
    }
  }

  /** Get the surge multiplier for a given lat/lng. */
  static async getSurgeMultiplier(lat: number, lng: number): Promise<number> {
    const geohash = Geohash.encode(lat, lng, 5); // precision-5 ≈ 4.9km cell
    const redis = await getRedisClient();
    const raw = await redis.get(`geohash:surge:${geohash}`);
    return raw ? parseFloat(raw) : 1.0;
  }

  /** Increment demand counter for a geohash cell (call when rider opens map). */
  static async recordDemand(lat: number, lng: number): Promise<void> {
    const geohash = Geohash.encode(lat, lng, 5);
    const redis = await getRedisClient();
    await redis.incr(`geohash:demand:${geohash}`);
    await redis.expire(`geohash:demand:${geohash}`, 120);
  }

  /** Estimate fare for a hypothetical trip. */
  static async estimateFare(
    lat: number,
    lng: number,
    estimatedDistanceKm: number,
    estimatedDurationMin: number,
  ): Promise<{
    baseFare: number;
    perMinute: number;
    perKm: number;
    surgeMult: number;
    estimatedFareCents: number;
  }> {
    const config = await PricingService.getConfig();
    const surgeMult = await PricingService.getSurgeMultiplier(lat, lng);
    const estimatedFareCents = Math.round(
      (config.baseFare +
        config.perMinute * estimatedDurationMin +
        config.perKm * estimatedDistanceKm) *
        surgeMult *
        100,
    );

    return {
      baseFare: config.baseFare,
      perMinute: config.perMinute,
      perKm: config.perKm,
      surgeMult,
      estimatedFareCents,
    };
  }

  /** Simple Haversine distance helper (returns km) */
  private static getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Advanced Trip Estimator (Upfront Pricing with Zone/Dock checks)
   * This is the core logic that executes the "Hybrid Parking" and "Zone Rule" business requirements.
   */
  static async estimateTrip(userLat: number, userLng: number, destLat: number, destLng: number) {
    // 1. Calculate estimated distance and duration
    const straightDistance = this.getDistanceKm(userLat, userLng, destLat, destLng);
    const estimatedDistanceKm = straightDistance * 1.3; // Multiply by 1.3 for winding roads
    const estimatedDurationMin = (estimatedDistanceKm / 15) * 60; // Assuming 15km/h avg speed

    const config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    const outOfDockFeeCents = config?.outOfDockFeeCents || 50000;

    let baseFare = (config?.unlockFeeCents || 5000) / 100;
    let perMinute = (config?.perMinuteCents || 2000) / 100;
    let perKm = (config?.perKmCents || 3000) / 100;

    // 2. Intersect Destination with PostGIS Geofences
    const intersectingZones = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        type: string;
        base_fare_override: number | null;
        per_minute_override: number | null;
      }>
    >`
      SELECT id, name, type, "base_fare_override", "per_minute_override"
      FROM geofences
      WHERE ST_Contains(
        ST_GeomFromGeoJSON(boundary::text),
        ST_SetSRID(ST_Point(${destLng}, ${destLat}), 4326)
      )
    `;

    const warnings: string[] = [];
    let convenienceFeeCents = 0;
    let isAllowed = true;

    // Apply Zone Overrides (Priority goes to restrictions)
    for (const zone of intersectingZones) {
      if (zone.type === 'no_ride') {
        isAllowed = false;
        warnings.push(`Destination is inside restricted zone: ${zone.name}`);
      }
      if (zone.base_fare_override) baseFare = zone.base_fare_override / 100;
      if (zone.per_minute_override) perMinute = zone.per_minute_override / 100;
    }

    // 3. Dock Proximity Check (200 meter radius)
    // If no docks within 200m, apply the Out-of-Dock Convenience Fee
    const nearbyDocks = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM docks
      WHERE ST_DWithin(
        ST_SetSRID(ST_Point("location_lng", "location_lat"), 4326)::geography,
        ST_SetSRID(ST_Point(${destLng}, ${destLat}), 4326)::geography,
        200
      )
    `;

    if (nearbyDocks.length === 0) {
      convenienceFeeCents = outOfDockFeeCents;
      warnings.push('Free-parking permitted (Convenience fee applies)');
    }

    // 4. Resource validation (Requires 1.5% battery per km + 5% buffer)
    const requiredBatteryPct = Math.ceil(estimatedDistanceKm * 1.5 + 5);

    // 5. Final Upfront Fare Calculation
    const surgeMult = await PricingService.getSurgeMultiplier(userLat, userLng);
    const rideCostCents = Math.round(
      (baseFare + perMinute * estimatedDurationMin + perKm * estimatedDistanceKm) * surgeMult * 100,
    );

    const totalEstimatedFareCents = rideCostCents + convenienceFeeCents;

    return {
      allowed: isAllowed,
      estimatedDistanceKm: Math.round(estimatedDistanceKm * 10) / 10,
      estimatedDurationMin: Math.round(estimatedDurationMin),
      requiredBatteryPct,
      surgeMult,
      rideCostCents,
      convenienceFeeCents,
      totalEstimatedFareCents,
      warnings,
    };
  }
}

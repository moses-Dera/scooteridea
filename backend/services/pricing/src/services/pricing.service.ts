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
      const demand  = parseInt((await redis.get(key)) ?? '0', 10);

      // Count available bikes in cell (simplified: use total for now)
      const supply  = await redis.zCard('fleet:available');

      const ratio = supply / Math.max(demand, 1);
      const multiplier =
        ratio > 2.0 ? 1.0 :
        ratio > 1.0 ? 1.2 :
        ratio > 0.5 ? 1.5 : 2.0;

      await redis.setEx(`geohash:surge:${geohash}`, 120, multiplier.toString());
    }
  }

  /** Get the surge multiplier for a given lat/lng. */
  static async getSurgeMultiplier(lat: number, lng: number): Promise<number> {
    const geohash = Geohash.encode(lat, lng, 5); // precision-5 ≈ 4.9km cell
    const redis   = await getRedisClient();
    const raw     = await redis.get(`geohash:surge:${geohash}`);
    return raw ? parseFloat(raw) : 1.0;
  }

  /** Increment demand counter for a geohash cell (call when rider opens map). */
  static async recordDemand(lat: number, lng: number): Promise<void> {
    const geohash = Geohash.encode(lat, lng, 5);
    const redis   = await getRedisClient();
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
      (config.baseFare + config.perMinute * estimatedDurationMin + config.perKm * estimatedDistanceKm) *
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
}

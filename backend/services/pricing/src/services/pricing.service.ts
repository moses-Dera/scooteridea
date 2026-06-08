import { getRedisClient, geoSearch } from '@ebike/redis';
import Geohash from 'ngeohash';

const BASE_FARE    = 50;   // NGN flat start
const COST_PER_MIN = 20;   // NGN / min
const COST_PER_KM  = 30;   // NGN / km

export class PricingService {
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
    const surgeMult = await PricingService.getSurgeMultiplier(lat, lng);
    const estimatedFareCents = Math.round(
      (BASE_FARE + COST_PER_MIN * estimatedDurationMin + COST_PER_KM * estimatedDistanceKm) *
        surgeMult *
        100,
    );

    return {
      baseFare: BASE_FARE,
      perMinute: COST_PER_MIN,
      perKm: COST_PER_KM,
      surgeMult,
      estimatedFareCents,
    };
  }
}

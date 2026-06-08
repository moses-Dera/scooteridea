import { getRedisClient, geoSearch, redisGetJson } from '@ebike/redis';
import { NotFoundError } from '@ebike/core';

// ── Lua script for atomic reservation (prevents double-booking) ───────────────
const RESERVE_BIKE_LUA = `
local status = redis.call('GET', KEYS[1])
if status == 'available' then
  redis.call('SET', KEYS[1], 'reserved')
  redis.call('EXPIRE', KEYS[1], 15)
  return 1
end
return 0
`;

interface ScoredBike {
  bikeId: string;
  distanceKm: number;
  batteryPct: number;
  nearestDockKm: number;
  score: number;
}

export class MatchingService {
  /**
   * Geo-query → score → atomic Lua reservation.
   * Matches backend_architecture.md §3.4 exactly.
   */
  static async matchBike(
    userLat: number,
    userLng: number,
    radiusKm = 2,
  ): Promise<{ bikeId: string; score: number }> {
    const candidates = await geoSearch('fleet:available', userLng, userLat, radiusKm, 30);

    if (!candidates.length) {
      throw new NotFoundError('No bikes available nearby');
    }

    // Score each candidate
    const scored: ScoredBike[] = await Promise.all(
      candidates.map(async (c) => {
        const bikeData = await redisGetJson<{
          lat: number;
          lng: number;
          battery_pct: number;
        }>(`bike:${c.member}:location`);

        const batteryPct    = bikeData?.battery_pct ?? 0;
        const nearestDockKm = await MatchingService.getNearestDockDistance(
          bikeData?.lat ?? 0,
          bikeData?.lng ?? 0,
        );

        const distanceKm = c.distance ?? 0;

        return {
          bikeId:       c.member,
          distanceKm,
          batteryPct,
          nearestDockKm,
          score:        scoreBike({ distanceKm, batteryPct, nearestDock: nearestDockKm }),
        };
      }),
    );

    // Pick the best
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Atomic reservation via Lua
    const redis = await getRedisClient();
    const reserved = await redis.eval(RESERVE_BIKE_LUA, { keys: [`bike:${best.bikeId}:status`], arguments: [] });

    if (!reserved) {
      // Bike was snatched; retry with next best
      const next = scored[1];
      if (!next) throw new NotFoundError('No bikes available');
      return { bikeId: next.bikeId, score: next.score };
    }

    return { bikeId: best.bikeId, score: best.score };
  }

  private static async getNearestDockDistance(lat: number, lng: number): Promise<number> {
    const results = await geoSearch('docks:available', lng, lat, 10, 1);
    return results[0]?.distance ?? 99;
  }
}

/** Scoring function from architecture doc §3.4. */
function scoreBike({
  distanceKm,
  batteryPct,
  nearestDock,
}: {
  distanceKm: number;
  batteryPct: number;
  nearestDock: number;
}) {
  return (
    (1 / Math.max(distanceKm, 0.01)) * 0.4 +
    (batteryPct / 100)               * 0.3 +
    (1 / (nearestDock + 0.1))        * 0.3
  );
}


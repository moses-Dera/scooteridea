import { createClient, RedisClientType, GeoReplyWith } from 'redis';

let client: RedisClientType;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;

    // Use stderr directly — @ebike/redis must not depend on @ebike/core (avoid circular dep)
    client.on('error', (err) => process.stderr.write(`[Redis] Error: ${String(err)}\n`));
    client.on('reconnecting', () => process.stderr.write('[Redis] Reconnecting…\n'));

    await client.connect();
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) await client.quit();
}

// ── Typed Helpers ─────────────────────────────────────────────────────────────

/** Get a JSON-parsed value by key. Returns null if missing. */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await (await getRedisClient()).get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    process.stderr.write(`[Redis] JSON parse error for key ${key}: ${String(err)}\n`);
    return null;
  }
}

/** Set a JSON-serialised value, with optional TTL in seconds. */
export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  const r = await getRedisClient();
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await r.setEx(key, ttlSeconds, payload);
  } else {
    await r.set(key, payload);
  }
}

/** Add a member to a Redis GEO set. */
export async function geoAdd(
  key: string,
  longitude: number,
  latitude: number,
  member: string,
): Promise<void> {
  const r = await getRedisClient();
  await r.geoAdd(key, { longitude, latitude, member });
}

/**
 * Search within a radius (km) and return member name, distance (km), and
 * coordinates for each result.
 *
 * Uses `geoSearchWith` — node-redis v4's typed variant that accepts
 * `GeoReplyWith` flags. The plain `geoSearch` only returns `string[]`.
 */
export async function geoSearch(
  key: string,
  longitude: number,
  latitude: number,
  radiusKm: number,
  count = 30,
) {
  const r = await getRedisClient();
  return r.geoSearchWith(
    key,
    { longitude, latitude },
    { radius: radiusKm, unit: 'km' },
    [GeoReplyWith.DISTANCE, GeoReplyWith.COORDINATES],
    { SORT: 'ASC', COUNT: count },
  );
}

// ── GPS Waypoint Track ───────────────────────────────────────────────────────

/**
 * Append a GPS waypoint to a ride's breadcrumb list.
 * Key: `ride:${rideId}:waypoints`  — type: Redis LIST of JSON strings.
 * TTL is refreshed to 2 h on every push (ride can't last longer than that).
 */
export async function redisPushWaypoint(rideId: string, lat: number, lng: number): Promise<void> {
  const r = await getRedisClient();
  const key = `ride:${rideId}:waypoints`;
  await r.rPush(key, JSON.stringify({ lat, lng }));
  await r.expire(key, 7_200); // 2 h
}

/**
 * Retrieve all recorded waypoints for a ride.
 * Returns an empty array if the key has expired or doesn't exist.
 */
export async function redisGetWaypoints(
  rideId: string,
): Promise<Array<{ lat: number; lng: number }>> {
  const r = await getRedisClient();
  const raw = await r.lRange(`ride:${rideId}:waypoints`, 0, -1);
  return raw
    .map((s) => {
      try {
        return JSON.parse(s) as { lat: number; lng: number };
      } catch {
        return null;
      }
    })
    .filter((Boolean as any)) as Array<{ lat: number; lng: number }>;
}

/**
 * Delete the waypoint track (call after fare is computed to free memory).
 */
export async function redisDeleteWaypoints(rideId: string): Promise<void> {
  const r = await getRedisClient();
  await r.del(`ride:${rideId}:waypoints`);
}

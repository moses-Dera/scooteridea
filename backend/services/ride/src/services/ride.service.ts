// ─────────────────────────────────────────────────────────────────────────────
//  Ride Service — business logic
//
//  Uses typed domain errors from @ebike/core.
//  Kafka events wrapped with DLQ in the payment consumer (see payment service).
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@ebike/db';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BikeUnavailableError,
  RideNotActiveError,
  retry,
  logger,
} from '@ebike/core';
import { getRedisClient, redisGetJson, redisGetWaypoints, redisDeleteWaypoints } from '@ebike/redis';
import { kafka }          from '@ebike/kafka';
import { bikeCommander }  from '@ebike/mqtt';
import Geohash           from 'ngeohash';

const BASE_FARE     = 50;    // NGN flat start
const COST_PER_MIN  = 20;    // NGN / min
const COST_PER_KM   = 30;    // NGN / km

// ── Pure Haversine ────────────────────────────────────────────────────────────
/** Returns great-circle distance in km between two coordinate pairs. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sum Haversine distance over an ordered array of waypoints. */
function totalDistanceKm(pts: Array<{ lat: number; lng: number }>): number {
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  }
  return total;
}

export class RideService {
  // ── Reserve ──────────────────────────────────────────────────────────────────
  static async reserve(bikeId: string, userId: string) {
    const redis  = await getRedisClient();
    const status = await redis.get(`bike:${bikeId}:status`);

    if (status !== 'available') {
      throw new BikeUnavailableError(bikeId, status ?? 'unknown');
    }

    // Check user doesn't already have an active ride
    const existingSession = await redis.get(`session:${userId}`);
    if (existingSession) {
      throw new ConflictError('You already have an active ride', { userId });
    }

    const ride = await prisma.ride.create({
      data: { userId, bikeId, status: 'RESERVED' },
    });

    logger.info({ rideId: ride.id, bikeId, userId }, '[Ride] Reserved');
    return ride;
  }

  // ── Start ────────────────────────────────────────────────────────────────────
  static async startRide(rideId: string, userId: string): Promise<void> {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride)                       throw new NotFoundError('Ride', rideId);
    if (ride.status !== 'RESERVED')  throw new ConflictError(`Ride is not in RESERVED state`, { rideId, currentStatus: ride.status });
    if (ride.userId !== userId)      throw new ForbiddenError();

    // Send UNLOCK — retry up to 3 times on MQTT flap
    await retry(
      () => bikeCommander.unlock(ride.bikeId, rideId),
      { maxAttempts: 3, label: 'mqtt:unlock' },
    );

    await prisma.ride.update({
      where: { id: rideId },
      data:  { status: 'ACTIVE', startedAt: new Date() },
    });

    const redis = await getRedisClient();
    // session:userId — tracks that user has an active ride (prevents double-booking)
    await redis.set(
      `session:${userId}`,
      JSON.stringify({ rideId, bikeId: ride.bikeId, startedAt: Date.now() }),
    );
    // bike:bikeId:ride — allows fleet-service to look up rideId when appending GPS waypoints
    await redis.set(
      `bike:${ride.bikeId}:ride`,
      JSON.stringify({ rideId, userId }),
    );

    await kafka.rideStarted({ rideId, bikeId: ride.bikeId, userId, ts: Date.now() });
    logger.info({ rideId, bikeId: ride.bikeId, userId }, '[Ride] Started');
  }

  // ── End ──────────────────────────────────────────────────────────────────────
  static async endRide(rideId: string, dockId: string): Promise<{ fareCents: number }> {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride)                     throw new NotFoundError('Ride', rideId);
    if (ride.status !== 'ACTIVE')  throw new RideNotActiveError(rideId, ride.status);

    const durationMin = (Date.now() - (ride.startedAt?.getTime() ?? Date.now())) / 60_000;

    // ── Distance: sum Haversine over Redis GPS waypoint track ─────────────────
    const waypoints   = await redisGetWaypoints(rideId);
    const distanceKm  = totalDistanceKm(waypoints);
    if (waypoints.length < 2) {
      logger.warn({ rideId, waypointCount: waypoints.length }, '[Ride] Insufficient waypoints — distance defaulting to 0');
    }

    // ── Surge: read geohash:surge:* from Redis using bike's last-known position ─
    let surgeMult = 1.0;
    try {
      const location = await redisGetJson<{ lat: number; lng: number }>(`bike:${ride.bikeId}:location`);
      if (location) {
        const geohash = Geohash.encode(location.lat, location.lng, 5);
        const redis   = await getRedisClient();
        const raw     = await redis.get(`geohash:surge:${geohash}`);
        surgeMult     = raw ? parseFloat(raw) : 1.0;
      }
    } catch (err) {
      logger.warn({ err, rideId }, '[Ride] Surge lookup failed — defaulting to 1.0x');
    }

    const fareCents = Math.max(
      50 * 100,  // minimum fare: ₦50
      Math.round(
        (BASE_FARE + COST_PER_MIN * durationMin + COST_PER_KM * distanceKm) * surgeMult * 100,
      ),
    );

    // Lock the bike (best-effort, don't fail ride-end if MQTT is down)
    bikeCommander.lock(ride.bikeId).catch((err) =>
      logger.warn({ err, bikeId: ride.bikeId }, '[Ride] MQTT lock command failed — bike may need manual lock'),
    );

    await prisma.ride.update({
      where: { id: rideId },
      data:  {
        status:     'COMPLETED',
        endedAt:    new Date(),
        fareCents,
        distanceKm,
        surgeMult,
        endDockId:  dockId,
      },
    });

    // Emit billing + ended events
    await Promise.all([
      kafka.paymentCharge({ userId: ride.userId, amount: fareCents, rideId, ts: Date.now() }),
      kafka.rideEnded({ rideId, fareCents, userId: ride.userId, ts: Date.now() }),
    ]);

    const redis = await getRedisClient();
    await Promise.all([
      redis.del(`session:${ride.userId}`),
      redis.del(`bike:${ride.bikeId}:ride`),
      redisDeleteWaypoints(rideId),        // free GPS track memory
    ]);

    logger.info(
      { rideId, fareCents, distanceKm: distanceKm.toFixed(2), durationMin: durationMin.toFixed(1), surgeMult },
      '[Ride] Ended',
    );
    return { fareCents };
  }

  /** Called by Dock Service when a bike physically docks (Kafka event → HTTP or via event). */
  static async confirmDockIn(bikeId: string, dockId: string): Promise<void> {
    const activeRide = await prisma.ride.findFirst({
      where: { bikeId, status: 'ACTIVE' },
    });
    if (activeRide) {
      await RideService.endRide(activeRide.id, dockId);
    }
  }

  static async getById(rideId: string) {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('Ride', rideId);
    return ride;
  }

  static async getHistory(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.ride.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    pageSize,
      }),
      prisma.ride.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async disputeRide(rideId: string, _reason: string) {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('Ride', rideId);
    return prisma.ride.update({ where: { id: rideId }, data: { status: 'CANCELLED' } });
  }

  static async getTopRiders(limit: number = 5) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const topRiders = await prisma.ride.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: todayStart },
        status: { in: ['COMPLETED', 'PAID'] },
      },
      _count: { id: true },
      _sum: { distance_km: true, duration_sec: true },
      orderBy: [{ _count: { id: 'desc' } }],
      take: limit,
    });

    // Get user details
    const riders = await Promise.all(
      topRiders.map(async (group) => {
        const user = await prisma.user.findUnique({ where: { id: group.userId } });
        return {
          id: group.userId,
          name: user?.name || 'Unknown',
          email: user?.email,
          rides_count: group._count.id,
          total_distance: Math.round((group._sum.distance_km || 0) * 1000), // in meters
          total_duration: group._sum.duration_sec || 0,
        };
      })
    );

    return riders;
  }

  static async getAnalytics(timeRange: string = 'today') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const [
      totalRides,
      totalRevenue,
      activeUsers,
      avgDuration,
      avgDistance,
      ridesData,
    ] = await Promise.all([
      prisma.ride.count({
        where: { createdAt: { gte: startDate }, status: { in: ['COMPLETED', 'PAID'] } },
      }),
      prisma.ride.aggregate({
        where: { createdAt: { gte: startDate }, status: 'PAID' },
        _sum: { amount_cents: true },
      }),
      prisma.ride.findMany({
        where: { createdAt: { gte: startDate } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.ride.aggregate({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        _avg: { duration_sec: true },
      }),
      prisma.ride.aggregate({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        _avg: { distance_km: true },
      }),
      prisma.ride.findMany({
        where: { createdAt: { gte: startDate }, status: { in: ['COMPLETED', 'PAID'] } },
        select: { duration_sec: true, distance_km: true },
      }),
    ]);

    const avgDurationMins = avgDuration._avg.duration_sec
      ? Math.round((avgDuration._avg.duration_sec / 60) * 10) / 10
      : 0;

    const avgDistanceKm = avgDistance._avg.distance_km
      ? Math.round(avgDistance._avg.distance_km * 10) / 10
      : 0;

    return {
      total_rides: totalRides,
      total_revenue: Math.round((totalRevenue._sum.amount_cents || 0) / 100),
      active_users: activeUsers.length,
      fleet_utilization: 78, // Placeholder - would need fleet size
      avg_ride_duration: avgDurationMins,
      avg_ride_distance: avgDistanceKm,
      bikes_active: 156, // Placeholder - would fetch from fleet service
      bikes_total: 200, // Placeholder
    };
  }
}

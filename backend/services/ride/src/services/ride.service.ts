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
  InsufficientBalanceError,
  retry,
  logger,
} from '@ebike/core';
import {
  getRedisClient,
  redisGetJson,
  redisGetWaypoints,
  redisDeleteWaypoints,
} from '@ebike/redis';
import { TOPICS, kafka, publish } from '@ebike/events';
import { bikeCommander } from '@ebike/mqtt';
import Geohash from 'ngeohash';
import { randomInt } from 'crypto';

async function getConfig(bikeId?: string) {
  let globalConfig = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
  if (!globalConfig) {
    globalConfig = await prisma.systemConfig.create({ data: { id: 'global' } });
  }

  let base = globalConfig.unlockFeeCents;
  let min = globalConfig.perMinuteCents;
  let km = globalConfig.perKmCents;

  if (bikeId) {
    // Resolve hierarchy: Dock > Geofence > Global
    const bike = await prisma.bike.findUnique({
      where: { id: bikeId },
      include: { dock: true },
    });
    if (bike?.dock) {
      if (bike.dock.baseFareOverride != null) base = bike.dock.baseFareOverride;
      if (bike.dock.perMinuteOverride != null) min = bike.dock.perMinuteOverride;
      if (bike.dock.perKmOverride != null) km = bike.dock.perKmOverride;
    }
  }

  return {
    baseFareCents: base,
    perMinuteCents: min,
    perKmCents: km,
  };
}

// ── Pure Haversine ────────────────────────────────────────────────────────────
/** Returns great-circle distance in km between two coordinate pairs. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
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
  // ── Get Active Ride ──────────────────────────────────────────────────────────
  static async getActiveRide(userId: string) {
    return await prisma.ride.findFirst({
      where: {
        userId,
        status: { in: ['RESERVED', 'ACTIVE'] },
      },
      include: {
        bike: true,
      },
    });
  }

  // ── Reserve ──────────────────────────────────────────────────────────────────
  static async reserve(bikeId: string, userId: string) {
    const redis = await getRedisClient();

    // Check user doesn't already have an active ride (fast Redis check first)
    const existingSession = await redis.get(`session:${userId}`);
    if (existingSession) {
      throw new ConflictError('You already have an active ride', { userId });
    }

    // Atomically verify + claim the bike in a DB transaction to prevent double-booking.
    // This is the authoritative check; Redis status is a fast-read cache only.
    const ride = await prisma.$transaction(async (tx) => {
      const bike = await tx.bike.findUnique({ where: { id: bikeId }, include: { dock: true } });
      if (!bike) throw new NotFoundError('Bike', bikeId);
      if (bike.status !== 'available') throw new BikeUnavailableError(bikeId, bike.status);

      // Lock in the price for this ride at reservation time
      const pricing = await getConfig(bikeId);

      // Verify User has enough funds to cover the base fare (minimum balance)
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User', userId);

      if (user.walletCents < pricing.baseFareCents) {
        throw new InsufficientBalanceError(pricing.baseFareCents, user.walletCents);
      }

      // Mark bike as in_use atomically — any concurrent reservation hits the status check above
      if (bike.dockId) {
        // Free up the dock slot, safely capped at totalSlots
        const dock = await tx.dock.findUnique({ where: { id: bike.dockId } });
        if (dock) {
          await tx.dock.update({
            where: { id: bike.dockId },
            data: { availableSlots: Math.min(dock.totalSlots, dock.availableSlots + 1) },
          });
        }
        await tx.bike.update({
          where: { id: bikeId },
          data: { status: 'in_use', dockId: null },
        });
      } else {
        await tx.bike.update({
          where: { id: bikeId },
          data: { status: 'in_use' },
        });
      }

      return tx.ride.create({
        data: {
          userId,
          bikeId,
          status: 'RESERVED',
          lockedBaseFareCents: pricing.baseFareCents,
          lockedPerMinCents: pricing.perMinuteCents,
          lockedPerKmCents: pricing.perKmCents,
        },
        include: { bike: true },
      });
    });

    // If the bike doesn't have a PIN yet, generate one now
    if (!ride.bike.currentPin) {
      const newPin = randomInt(1000, 10000).toString();
      await prisma.bike.update({
        where: { id: bikeId },
        data: { currentPin: newPin },
      });
      ride.bike.currentPin = newPin;
    }

    // Sync Redis status to match DB
    await redis.set(`bike:${bikeId}:status`, 'in_use');

    logger.info({ rideId: ride.id, bikeId, userId }, '[Ride] Reserved');
    return ride;
  }

  // ── Start ────────────────────────────────────────────────────────────────────
  static async startRide(rideId: string, userId: string): Promise<void> {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('Ride', rideId);
    if (ride.status !== 'RESERVED')
      throw new ConflictError(`Ride is not in RESERVED state`, {
        rideId,
        currentStatus: ride.status,
      });
    if (ride.userId !== userId) throw new ForbiddenError();

    // Send UNLOCK — retry up to 3 times on MQTT flap
    await retry(() => bikeCommander.unlock(ride.bikeId, rideId), {
      maxAttempts: 3,
      label: 'mqtt:unlock',
    });

    const redis = await getRedisClient();

    // Capture starting battery percentage
    let batteryStartPct = null;
    const locationRaw = await redis.get(`bike:${ride.bikeId}:location`);
    if (locationRaw) {
      try {
        const loc = JSON.parse(locationRaw);
        if (typeof loc?.battery_pct === 'number') {
          batteryStartPct = loc.battery_pct;
        }
      } catch (err) {
        logger.warn(
          { err, bikeId: ride.bikeId },
          '[Ride] Failed to parse starting location from Redis',
        );
      }
    }

    await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'ACTIVE', startedAt: new Date(), batteryStartPct },
    });

    // session:userId — tracks that user has an active ride (prevents double-booking)
    await redis.set(
      `session:${userId}`,
      JSON.stringify({ rideId, bikeId: ride.bikeId, startedAt: Date.now() }),
    );
    // bike:bikeId:ride — allows fleet-service to look up rideId when appending GPS waypoints
    await redis.set(`bike:${ride.bikeId}:ride`, JSON.stringify({ rideId, userId }));

    await kafka.rideStarted({ rideId, bikeId: ride.bikeId, userId, ts: Date.now() });
    logger.info({ rideId, bikeId: ride.bikeId, userId }, '[Ride] Started');
  }

  // ── End ──────────────────────────────────────────────────────────────────────
  static async calculateLiveFare(rideId: string): Promise<{ fareCents: number, distanceKm: number, endBatteryPct: number | null, batteryUsedPct: number | null, durationMin: number, waypoints: any[], surgeMult: number }> {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('Ride', rideId);

    const durationMin = (Date.now() - (ride.startedAt?.getTime() ?? Date.now())) / 60_000;

    // ── Distance: sum Haversine over Redis GPS waypoint track ─────────────────
    const waypoints = await redisGetWaypoints(rideId);
    const distanceKm = totalDistanceKm(waypoints);
    if (waypoints.length < 2) {
      logger.warn(
        { rideId, waypointCount: waypoints.length },
        '[Ride] Insufficient waypoints — distance defaulting to 0',
      );
    }

    // ── Surge: read geohash:surge:* from Redis using bike's last-known position ─
    let surgeMult = 1.0;
    let endBatteryPct = null;
    try {
      const location = await redisGetJson<{ lat: number; lng: number; battery_pct?: number }>(
        `bike:${ride.bikeId}:location`,
      );
      if (location) {
        endBatteryPct = location.battery_pct ?? null;
        const geohash = Geohash.encode(location.lat, location.lng, 5);
        const redis = await getRedisClient();
        const raw = await redis.get(`geohash:surge:${geohash}`);
        surgeMult = raw ? parseFloat(raw) : 1.0;
      }
    } catch (err) {
      logger.warn({ err, rideId }, '[Ride] Surge lookup failed — defaulting to 1.0x');
    }

    let batteryUsedPct = null;
    if (ride.batteryStartPct != null && endBatteryPct != null) {
      batteryUsedPct = Math.max(0, ride.batteryStartPct - endBatteryPct);
    }

    const config = await getConfig();
    const baseFare = (ride.lockedBaseFareCents ?? config.baseFareCents) / 100;
    const perMinute = (ride.lockedPerMinCents ?? config.perMinuteCents) / 100;
    const perKm = (ride.lockedPerKmCents ?? config.perKmCents) / 100;

    const fareCents = Math.max(
      Math.round(baseFare * 100), // minimum fare is base fare
      Math.round((baseFare + perMinute * durationMin + perKm * distanceKm) * surgeMult * 100),
    );

    return { fareCents, distanceKm, endBatteryPct, batteryUsedPct, durationMin, waypoints, surgeMult };
  }

  static async endRide(rideId: string, dockId?: string | null): Promise<{ fareCents: number }> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { user: true },
    });
    if (!ride) throw new NotFoundError('Ride', rideId);
    if (ride.status !== 'ACTIVE') throw new RideNotActiveError(rideId, ride.status);

    const { fareCents, distanceKm, endBatteryPct, batteryUsedPct, durationMin, waypoints, surgeMult } = await RideService.calculateLiveFare(rideId);

    // ── Generate Rolling PIN ────────────────────────────────────────────────
    const newPin = randomInt(1000, 10000).toString();

    // Update Bike with new PIN and optionally dock it
    await prisma.bike.update({
      where: { id: ride.bikeId },
      data: { currentPin: newPin, dockId: dockId || null },
    });

    if (dockId) {
      const dock = await prisma.dock.findUnique({ where: { id: dockId } });
      if (dock) {
        await prisma.dock.update({
          where: { id: dockId },
          data: { availableSlots: Math.max(0, dock.availableSlots - 1) },
        });
      }
    }

    // Lock the bike and update PIN on hardware (best-effort, don't fail ride-end if MQTT is down)
    bikeCommander
      .lock(ride.bikeId)
      .catch((err) =>
        logger.warn(
          { err, bikeId: ride.bikeId },
          '[Ride] MQTT lock command failed — bike may need manual lock',
        ),
      );
    bikeCommander
      .setPin(ride.bikeId, newPin)
      .catch((err: any) =>
        logger.warn(
          { err, bikeId: ride.bikeId },
          '[Ride] MQTT set_pin command failed — bike PIN not rolled on hardware',
        ),
      );

    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        fareCents,
        distanceKm,
        surgeMult,
        endDockId: dockId,
        batteryUsedPct,
        routeGeometry: waypoints as any,
      },
    });

    // Emit billing + ended events
    await Promise.all([
      kafka.paymentCharge({ userId: ride.userId, amount: fareCents, rideId, ts: Date.now() }),
      kafka.rideEnded({
        rideId,
        fareCents,
        userId: ride.userId,
        userEmail: ride.user?.email,
        userName: ride.user?.name,
        ts: Date.now(),
      }),
    ]);

    const redis = await getRedisClient();
    await Promise.all([
      redis.del(`session:${ride.userId}`),
      redis.del(`bike:${ride.bikeId}:ride`),
      redisDeleteWaypoints(rideId), // free GPS track memory
    ]);

    logger.info(
      {
        rideId,
        fareCents,
        distanceKm: distanceKm.toFixed(2),
        durationMin: durationMin.toFixed(1),
        surgeMult,
      },
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
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.ride.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async getAllHistory(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.ride.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.ride.count(),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async disputeRide(rideId: string, userId: string, role: string, reason: string) {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundError('Ride', rideId);

    // 1. Verify ownership or admin privileges
    if (ride.userId !== userId && role !== 'ADMIN' && role !== 'OPERATOR') {
      logger.warn({ rideId, userId, role }, 'Unauthorized dispute attempt');
      throw new ForbiddenError('You can only dispute your own rides');
    }

    // 2. Perform refund and cancellation atomically
    const refundAmount = ride.status === 'COMPLETED' ? (ride.fareCents ?? 0) : 0;

    const [updatedRide] = await prisma.$transaction([
      prisma.ride.update({ where: { id: rideId }, data: { status: 'CANCELLED' } }),
      ...(refundAmount > 0
        ? [
            prisma.user.update({
              where: { id: ride.userId },
              data: { walletCents: { increment: refundAmount } },
            }),
          ]
        : []),
    ]);

    // 3. Emit support ticket event for back-office tracking
    await publish(TOPICS.SUPPORT_TICKET_CREATED, {
      ticketId: `disp_${rideId}`,
      userId: ride.userId,
      subject: `Ride Dispute: ${rideId}`,
      reason,
      refundedCents: refundAmount,
      timestamp: new Date().toISOString(),
    });

    logger.info({ rideId, userId, refundAmount, reason }, 'Ride disputed and cancelled');
    return updatedRide;
  }

  static async getTopRiders(limit: number = 5) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const topRiders = await prisma.ride.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: todayStart },
        status: { in: ['COMPLETED'] },
      },
      _count: { id: true },
      _sum: { distanceKm: true },
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
          rides_count: group._count?.id ?? 0,
          total_distance: Math.round(Number(group._sum?.distanceKm ?? 0) * 1000), // in meters
        };
      }),
    );

    return riders;
  }

  static async getAnalytics(
    timeRange: 'today' | 'week' | 'month' | 'all' = 'week',
  ): Promise<Record<string, any>> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const [totalRides, totalRevenue, activeUsers, avgDistance, bikesTotal, bikesActive] =
      await Promise.all([
        prisma.ride.count({
          where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        }),
        prisma.ride.aggregate({
          where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
          _sum: { fareCents: true },
        }),
        prisma.ride.findMany({
          where: { createdAt: { gte: startDate } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        prisma.ride.aggregate({
          where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
          _avg: { distanceKm: true },
        }),
        prisma.bike.count(),
        prisma.bike.count({ where: { status: 'in_use' } }),
      ]);

    const avgDistanceKm = avgDistance._avg?.distanceKm
      ? Math.round(Number(avgDistance._avg.distanceKm) * 10) / 10
      : 0;
    const fleetUtilization = bikesTotal > 0 ? Math.round((bikesActive / bikesTotal) * 100) : 0;

    // Use SQL for duration and time-series aggregation to avoid memory limits (M7)
    // 1. Average Ride Duration
    const durationRes: any[] = await prisma.$queryRaw`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) / 60), 0) as avg_duration
      FROM "Ride"
      WHERE "createdAt" >= ${startDate} AND status = 'COMPLETED' AND "endedAt" IS NOT NULL AND "startedAt" IS NOT NULL
    `;
    const avgRideDurationMins =
      durationRes.length > 0 ? Math.round(Number(durationRes[0].avg_duration) * 10) / 10 : 0;

    // 2. Time-series aggregation
    const truncType = timeRange === 'today' ? 'hour' : 'day';

    const revenueByDate: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT DATE_TRUNC($1, "createdAt") as time_bucket,
             SUM("fareCents") as revenue,
             COUNT(*) as rides
      FROM "Ride"
      WHERE "createdAt" >= $2 AND status = 'COMPLETED'
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `,
      truncType,
      startDate,
    );

    const usersByDate: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT DATE_TRUNC($1, "createdAt") as time_bucket,
             COUNT(DISTINCT "userId") as users
      FROM "Ride"
      WHERE "createdAt" >= $2
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `,
      truncType,
      startDate,
    );

    // Build continuous buckets (fill gaps with 0)
    const bucketsCount = timeRange === 'today' ? 24 : timeRange === 'week' ? 7 : 30;
    const stepMs = timeRange === 'today' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // For 'today', we align buckets to the start of the day. For others, to 7/30 days ago.
    const startBucketTime =
      timeRange === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        : new Date(now.getTime() - bucketsCount * stepMs).getTime();

    const revenueTrend = Array.from({ length: bucketsCount }).map((_, i) => {
      const bucketDate = new Date(startBucketTime + i * stepMs);
      const label =
        timeRange === 'today'
          ? bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // Find matching SQL result
      const match = revenueByDate.find(
        (r) => new Date(r.time_bucket).getTime() === bucketDate.getTime(),
      );

      return {
        time: label,
        revenue: match ? Number(match.revenue) / 100 : 0,
        rides: match ? Number(match.rides) : 0,
      };
    });

    let cumulativeUsers = 0;
    const userGrowth = Array.from({ length: bucketsCount }).map((_, i) => {
      const bucketDate = new Date(startBucketTime + i * stepMs);
      const label =
        timeRange === 'today'
          ? bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // Find matching SQL result
      const match = usersByDate.find(
        (r) => new Date(r.time_bucket).getTime() === bucketDate.getTime(),
      );
      if (match) {
        cumulativeUsers += Number(match.users);
      }

      return { time: label, users: cumulativeUsers };
    });

    return {
      total_rides: totalRides,
      total_revenue: Math.round((totalRevenue._sum?.fareCents ?? 0) / 100),
      active_users: activeUsers.length,
      fleet_utilization: fleetUtilization,
      avg_ride_duration: avgRideDurationMins,
      avg_ride_distance: avgDistanceKm,
      bikes_active: bikesActive,
      bikes_total: bikesTotal,
      revenueTrend,
      userGrowth,
    };
  }
}

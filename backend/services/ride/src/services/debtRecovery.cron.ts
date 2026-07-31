import { prisma } from '@ebike/db';
import { getRedisClient } from '@ebike/redis';
import { logger } from '@ebike/core';
import { bikeCommander } from '@ebike/mqtt';
import { RideService } from './ride.service';

/**
 * Runs periodically to ensure users do not exceed maximum debt.
 * Safely throttles the bike, and locks it when speed is zero.
 */
export async function processDebtRecovery() {
  logger.info('[DebtRecoveryCron] Checking active rides for debt recovery...');
  const redis = await getRedisClient();

  const activeRides = await prisma.ride.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true },
  });

  for (const ride of activeRides) {
    try {
      // 1. Calculate live fare
      const { fareCents } = await RideService.calculateLiveFare(ride.id);
      const balance = ride.user.walletCents - fareCents;

      // 2. Fetch live telemetry to check speed
      let speedKmh = 0;
      try {
        const rawLoc = await redis.get(`bike:${ride.bikeId}:location`);
        if (rawLoc) {
          const loc = JSON.parse(rawLoc);
          speedKmh = loc.speed_kmh ?? 0;
        }
      } catch (err) {
        logger.warn({ err, bikeId: ride.bikeId }, '[DebtRecoveryCron] Failed to parse bike location');
      }

      // 3. Apply protocol based on thresholds
      if (balance < -50000) { // -₦500
        if (speedKmh === 0) {
          logger.info({ rideId: ride.id, balance }, '[DebtRecoveryCron] Debt exceeds -₦500 and bike is stopped. Forcing end ride.');
          await RideService.endRide(ride.id, ride.endDockId ?? '');
        } else {
          logger.info({ rideId: ride.id, balance, speedKmh }, '[DebtRecoveryCron] Debt exceeds -₦500 but bike is moving. Throttling and waiting for stop.');
          await bikeCommander.speedLimit(ride.bikeId, 5).catch((err: any) => logger.warn({ err }, 'Failed to set speed limit'));
          await bikeCommander.alarm(ride.bikeId).catch((err: any) => logger.warn({ err }, 'Failed to trigger alarm'));
        }
      } else if (balance < -20000) { // -₦200
        logger.info({ rideId: ride.id, balance }, '[DebtRecoveryCron] Debt exceeds -₦200. Throttling bike to 5 km/h.');
        await bikeCommander.speedLimit(ride.bikeId, 5).catch((err: any) => logger.warn({ err }, 'Failed to set speed limit'));
        await bikeCommander.alarm(ride.bikeId).catch((err: any) => logger.warn({ err }, 'Failed to trigger alarm'));
      } else if (balance < 0) { // ₦0
        logger.info({ rideId: ride.id, balance }, '[DebtRecoveryCron] Balance depleted. Triggering warning alarm.');
        await bikeCommander.alarm(ride.bikeId).catch((err: any) => logger.warn({ err }, 'Failed to trigger alarm'));
      }
    } catch (err) {
      logger.error({ err, rideId: ride.id }, '[DebtRecoveryCron] Error processing ride debt recovery');
    }
  }
}

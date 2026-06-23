import { prisma } from '@ebike/db';
import { getRedisClient } from '@ebike/redis';
import { logger } from '@ebike/core';

/**
 * Runs daily to calculate how many kilometers each bike can travel per 1% of battery drop.
 * This replaces the complex ML predictive range system.
 */
export async function calculateBatteryEfficiency() {
  logger.info('[EfficiencyCron] Starting daily battery efficiency analysis...');
  const redis = await getRedisClient();

  // 1. Get all bikes
  const bikes = await prisma.bike.findMany({ select: { id: true } });

  // 2. We will look at rides from the last 7 days to calculate the average
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const bike of bikes) {
    try {
      // Find completed rides that have both distance and battery data
      const rides = await prisma.ride.findMany({
        where: { 
          bikeId: bike.id, 
          status: 'COMPLETED',
          endedAt: { gte: oneWeekAgo },
          distanceKm: { not: null },
          batteryUsedPct: { not: null } // We just added this to schema!
        },
        select: { 
          distanceKm: true,
          batteryUsedPct: true 
        }
      });

      let efficiencyKmPerPct = 0.40; // Default baseline (e.g. 40km total range = 0.4km per 1%)

      // If we have actual historical ride data, we calculate the real average for this exact bike
      if (rides.length > 0) {
        const totalDistance = rides.reduce((sum, r) => sum + Number(r.distanceKm), 0);
        const totalBatteryDrop = rides.reduce((sum, r) => sum + (r.batteryUsedPct || 0), 0);
        
        if (totalBatteryDrop > 0) {
          efficiencyKmPerPct = totalDistance / totalBatteryDrop;
        }
      }
      
      // Save the calculated efficiency to Redis so the matching system can use it instantly
      await redis.set(`bike:${bike.id}:efficiency`, efficiencyKmPerPct.toFixed(3));
      
    } catch (err) {
      logger.error(`[EfficiencyCron] Failed to process bike ${bike.id}`, err);
    }
  }
  
  logger.info('[EfficiencyCron] Battery efficiency analysis complete. All bikes updated.');
}

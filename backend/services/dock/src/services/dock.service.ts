import { getMqttClient, subscribeToTopic } from '@ebike/mqtt';
import { getRedisClient } from '@ebike/redis';
import { kafka } from '@ebike/events';
import type { DockTelemetryPayload } from '@ebike/types';

// Lazy import to avoid circular dep
let rideServiceEndpoint: string;

export class DockService {
  static async startMqttIngestion() {
    getMqttClient();

    subscribeToTopic('docks/+/status', async (topic, raw) => {
      try {
        const dockId = topic.split('/')[1];
        const payload = JSON.parse(raw) as DockTelemetryPayload;
        await DockService.handleDockTelemetry(dockId, payload);
      } catch (err) {
        console.error(`[Dock] Failed to process dock status for ${topic}`, err);
      }
    });

    console.log('[Dock] MQTT subscriptions active');
  }

  /**
   * Core dock telemetry handler — mirrors backend_architecture.md §3.7
   */
  static async handleDockTelemetry(dockId: string, payload: DockTelemetryPayload): Promise<void> {
    const redis = await getRedisClient();
    const { slots, available_slots, total_slots } = payload;

    // 1. Detect newly docked bikes (slot went from null → bikeId)
    const rawPrev = await redis.hGetAll(`dock:${dockId}:slots`);
    const prev: Record<string, string | null> = rawPrev ?? {};

    const newlyDocked = slots.filter((s) => {
      if (!s.bikeId) return false;
      const prevSlot = prev[String(s.slot)];
      if (!prevSlot) return true;
      try {
        return JSON.parse(prevSlot).bikeId !== s.bikeId;
      } catch {
        return false;
      }
    });

    // 2. Confirm ride-end for each newly docked bike via internal HTTP or Kafka
    for (const slot of newlyDocked) {
      if (slot.bikeId) {
        await kafka.fleetCommand({
          bikeId: slot.bikeId,
          command: 'LOCK',
          ts: Date.now(),
        });
        // Ride service listens to fleet.command events and calls confirmDockIn
        console.log(`[Dock] Bike ${slot.bikeId} docked at ${dockId} slot ${slot.slot}`);
      }
    }

    // 3. Update Redis dock state
    await redis.hSet(`dock:${dockId}:status`, {
      available_slots: available_slots.toString(),
      total_slots: total_slots.toString(),
    });

    for (const slot of slots) {
      await redis.hSet(
        `dock:${dockId}:slots`,
        String(slot.slot),
        JSON.stringify({ bikeId: slot.bikeId, charging: slot.charging }),
      );
    }

    // 4. Update geo index
    // (dock geo populated at startup from DB — only update availability set here)
    if (available_slots > 0) {
      await redis.zAdd('docks:available', [{ score: 0, value: dockId }]);
    } else {
      await redis.zRem('docks:available', dockId);
    }

    // 5. Rebalancing alerts
    const pct = available_slots / total_slots;
    if (pct <= 0.1) await kafka.opsAlert({ type: 'DOCK_FULL', dockId, ts: Date.now() });
    if (pct >= 0.9) await kafka.opsAlert({ type: 'DOCK_EMPTY', dockId, ts: Date.now() });

    // 6. Emit dock status event for WS Hub
    await kafka.dockStatus({
      dockId,
      availableSlots: available_slots,
      totalSlots: total_slots,
      ts: Date.now(),
    });
  }
}

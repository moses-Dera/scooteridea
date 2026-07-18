import { DockService } from './dock.service';
import { getRedisClient } from '@ebike/redis';
import { kafka } from '@ebike/events';
import type { DockTelemetryPayload } from '@ebike/types';

jest.mock('@ebike/redis', () => {
  const mRedisClient = {
    hGetAll: jest.fn(),
    hSet: jest.fn(),
    zAdd: jest.fn(),
    zRem: jest.fn(),
  };
  return {
    getRedisClient: jest.fn(() => mRedisClient),
  };
});

jest.mock('@ebike/events', () => {
  return {
    kafka: {
      fleetCommand: jest.fn(),
      opsAlert: jest.fn(),
      dockStatus: jest.fn(),
    },
  };
});

describe('DockService', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockClear();
    mockRedisClient = (getRedisClient as jest.Mock)();
  });

  describe('handleDockTelemetry', () => {
    const dockId = 'dock-123';
    
    it('detects newly docked bikes and locks them', async () => {
      // Previous state: slot 1 had bike-old, slot 2 was empty
      mockRedisClient.hGetAll.mockResolvedValue({
        '1': JSON.stringify({ bikeId: 'bike-old', charging: false }),
      });

      const payload: DockTelemetryPayload = {
        available_slots: 1,
        total_slots: 3,
        slots: [
          { slot: 1, bikeId: 'bike-old', charging: true }, // Not new
          { slot: 2, bikeId: 'bike-new', charging: true }, // NEW!
          { slot: 3, bikeId: null, charging: false },      // Empty
        ],
      };

      await DockService.handleDockTelemetry(dockId, payload);

      // Should command 'LOCK' only for the newly docked bike
      expect(kafka.fleetCommand).toHaveBeenCalledTimes(1);
      expect(kafka.fleetCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          bikeId: 'bike-new',
          command: 'LOCK',
        })
      );
    });

    it('updates Redis dock state and availability index', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const payload: DockTelemetryPayload = {
        available_slots: 5,
        total_slots: 10,
        slots: [],
      };

      await DockService.handleDockTelemetry(dockId, payload);

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(`dock:${dockId}:status`, {
        available_slots: '5',
        total_slots: '10',
      });
      // Since available > 0, it should be added to docks:available
      expect(mockRedisClient.zAdd).toHaveBeenCalledWith('docks:available', [{ score: 0, value: dockId }]);
    });

    it('removes dock from availability index when full', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const payload: DockTelemetryPayload = {
        available_slots: 0,
        total_slots: 10,
        slots: [],
      };

      await DockService.handleDockTelemetry(dockId, payload);

      expect(mockRedisClient.zRem).toHaveBeenCalledWith('docks:available', dockId);
      // Alerts because pct (0/10 = 0) <= 0.1
      expect(kafka.opsAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DOCK_FULL', dockId })
      );
    });

    it('alerts when dock is nearly empty', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const payload: DockTelemetryPayload = {
        available_slots: 9,
        total_slots: 10,
        slots: [],
      };

      await DockService.handleDockTelemetry(dockId, payload);

      // Alerts because pct (9/10 = 0.9) >= 0.9
      expect(kafka.opsAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DOCK_EMPTY', dockId })
      );
    });

    it('emits dockStatus event for WebSocket Hub', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const payload: DockTelemetryPayload = {
        available_slots: 5,
        total_slots: 10,
        slots: [],
      };

      await DockService.handleDockTelemetry(dockId, payload);

      expect(kafka.dockStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          dockId,
          availableSlots: 5,
          totalSlots: 10,
        })
      );
    });
  });
});

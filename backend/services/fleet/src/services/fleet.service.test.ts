import { FleetService } from './fleet.service';
import { getRedisClient, redisSetJson, geoAdd, redisPushWaypoint } from '@ebike/redis';
import { kafka } from '@ebike/events';
import { prisma } from '@ebike/db';
import type { BikeTelemetryPayload } from '@ebike/types';

jest.mock('@ebike/redis', () => {
  const mRedisClient = {
    set: jest.fn(),
    lPush: jest.fn(),
    lTrim: jest.fn(),
    get: jest.fn(),
    geoSearch: jest.fn(),
    keys: jest.fn(),
  };
  return {
    getRedisClient: jest.fn(() => mRedisClient),
    redisSetJson: jest.fn(),
    geoAdd: jest.fn(),
    redisPushWaypoint: jest.fn(),
    redisGetJson: jest.fn(),
  };
});

jest.mock('@ebike/events', () => ({
  kafka: {
    fleetTelemetry: jest.fn(),
    opsAlert: jest.fn(),
  },
}));

jest.mock('@ebike/db', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    zoneTransition: { create: jest.fn() },
  },
}));

jest.mock('@ebike/mqtt', () => ({
  bikeCommander: {
    disable: jest.fn(),
    speedLimit: jest.fn(),
  },
  getMqttClient: jest.fn(),
  subscribeToTopic: jest.fn(),
}));

describe('FleetService', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockClear();
    mockRedisClient = (getRedisClient as jest.Mock)();

    // Mock default geofence check to return empty
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    mockRedisClient.get.mockResolvedValue(null);
  });

  describe('handleBikeTelemetry', () => {
    const bikeId = 'bike-123';
    const payload: BikeTelemetryPayload = {
      lat: 51.505,
      lng: -0.09,
      battery_pct: 50,
      speed_kmh: 12,
      lock_status: 'UNLOCKED',
      docked_at: null,
    };

    it('processes telemetry for an in-use bike', async () => {
      // Mock that it is part of a ride
      mockRedisClient.get.mockImplementation((key: string) => {
        if (key === `bike:${bikeId}:ride`)
          return Promise.resolve(JSON.stringify({ rideId: 'ride-1' }));
        return Promise.resolve(null);
      });
      (redisPushWaypoint as jest.Mock).mockResolvedValue(true);

      await FleetService.handleBikeTelemetry(bikeId, payload);

      // Location tracking
      expect(redisSetJson).toHaveBeenCalledWith(
        `bike:${bikeId}:location`,
        expect.objectContaining({ lat: 51.505, lng: -0.09 }),
        30,
      );
      expect(geoAdd).toHaveBeenCalledWith('fleet:available', -0.09, 51.505, bikeId);

      // Status inference (UNLOCKED -> in_use)
      expect(mockRedisClient.set).toHaveBeenCalledWith(`bike:${bikeId}:status`, 'in_use');

      // Trails
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        `bike:${bikeId}:trail`,
        expect.stringContaining('"lat":51.505'),
      );

      // Ride waypoint
      expect(redisPushWaypoint).toHaveBeenCalledWith('ride-1', 51.505, -0.09);

      // Kafka telemetry
      expect(kafka.fleetTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          bikeId,
          status: 'in_use',
          batteryPct: 50,
        }),
      );

      // No low battery alert
      expect(kafka.opsAlert).not.toHaveBeenCalled();
    });

    it('infers available status when locked', async () => {
      await FleetService.handleBikeTelemetry(bikeId, { ...payload, lock_status: 'LOCKED' });
      expect(mockRedisClient.set).toHaveBeenCalledWith(`bike:${bikeId}:status`, 'available');
    });

    it('infers charging status when docked', async () => {
      await FleetService.handleBikeTelemetry(bikeId, {
        ...payload,
        lock_status: 'LOCKED',
        docked_at: 'dock-1',
      });
      expect(mockRedisClient.set).toHaveBeenCalledWith(`bike:${bikeId}:status`, 'charging');
    });

    it('sends an opsAlert when battery is critically low', async () => {
      await FleetService.handleBikeTelemetry(bikeId, { ...payload, battery_pct: 10 });
      expect(kafka.opsAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LOW_BATTERY', bikeId }),
      );
    });
  });
});

import { PricingService } from './pricing.service';
import { prisma } from '@ebike/db';
import { getRedisClient } from '@ebike/redis';

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('@ebike/db', () => {
  return {
    prisma: {
      systemConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    },
  };
});

jest.mock('@ebike/redis', () => {
  const mRedisClient = {
    get: jest.fn(),
    setEx: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    zCard: jest.fn(),
    keys: jest.fn(),
  };
  return {
    getRedisClient: jest.fn(() => mRedisClient),
  };
});

// Mock Geohash to avoid real encoding dependencies
jest.mock('ngeohash', () => ({
  encode: jest.fn(() => 'mockhash'),
}));

// ── Tests ────────────────────────────────────────────────────────────────────
describe('PricingService', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockClear();
    // Re-grab the mocked client for easy assertion
    mockRedisClient = (getRedisClient as jest.Mock)();
  });

  describe('getConfig', () => {
    it('returns formatted config when it exists', async () => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        unlockFeeCents: 10000,
        perMinuteCents: 5000,
        perKmCents: 8000,
      });

      const config = await PricingService.getConfig();
      expect(config).toEqual({
        baseFare: 100,
        perMinute: 50,
        perKm: 80,
      });
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({ where: { id: 'global' } });
    });

    it('creates and returns config when it does not exist', async () => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.systemConfig.create as jest.Mock).mockResolvedValue({
        id: 'global',
        unlockFeeCents: 5000, // default usually
        perMinuteCents: 2000,
        perKmCents: 3000,
      });

      const config = await PricingService.getConfig();
      expect(prisma.systemConfig.create).toHaveBeenCalledWith({ data: { id: 'global' } });
      expect(config.baseFare).toBe(50);
    });
  });

  describe('estimateFare', () => {
    it('calculates fare correctly with standard surge', async () => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        unlockFeeCents: 5000,
        perMinuteCents: 2000,
        perKmCents: 3000,
      });
      mockRedisClient.get.mockResolvedValue('1.5'); // surge multiplier

      const result = await PricingService.estimateFare(1.0, 1.0, 5, 10);
      
      // baseFare = 50
      // perMinute = 20 * 10 = 200
      // perKm = 30 * 5 = 150
      // subtotal = 400
      // surge = 1.5 -> 600
      expect(result.estimatedFareCents).toBe(60000);
      expect(result.surgeMult).toBe(1.5);
    });
  });

  describe('estimateTrip', () => {
    beforeEach(() => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'global',
        unlockFeeCents: 5000,
        perMinuteCents: 2000,
        perKmCents: 3000,
        outOfDockFeeCents: 50000,
      });
      mockRedisClient.get.mockResolvedValue('1.0'); // No surge
    });

    it('applies out of dock convenience fee when no docks nearby', async () => {
      // Mock intersecting zones (empty) -> queryRaw 1
      // Mock nearby docks (empty) -> queryRaw 2
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([]); 

      const result = await PricingService.estimateTrip(0, 0, 0.05, 0.05);

      expect(result.convenienceFeeCents).toBe(50000);
      expect(result.warnings).toContain('Free-parking permitted (Convenience fee applies)');
    });

    it('blocks trip if destination is in a no_ride zone', async () => {
      // Mock intersecting zones with no_ride -> queryRaw 1
      // Mock nearby docks (empty) -> queryRaw 2
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ type: 'no_ride', name: 'Restricted Area' }])
        .mockResolvedValueOnce([]);

      const result = await PricingService.estimateTrip(0, 0, 0.05, 0.05);

      expect(result.allowed).toBe(false);
      expect(result.warnings).toContain('Destination is inside restricted zone: Restricted Area');
    });

    it('applies zone pricing overrides', async () => {
      // Mock intersecting zones with overrides -> queryRaw 1
      // Mock nearby docks (1 dock found) -> queryRaw 2
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ type: 'discount', base_fare_override: 1000, per_minute_override: 1000 }])
        .mockResolvedValueOnce([{ id: 'dock-1' }]);

      const result = await PricingService.estimateTrip(0, 0, 0, 0); // 0 distance, 0 duration for simplicity

      // Base fare overridden to 10 (1000 cents), per min overridden to 10 (1000 cents)
      // cost = 10 * 100 = 1000 cents. No convenience fee.
      expect(result.rideCostCents).toBe(1000);
      expect(result.convenienceFeeCents).toBe(0);
      expect(result.totalEstimatedFareCents).toBe(1000);
    });
  });
});

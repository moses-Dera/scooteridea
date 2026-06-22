import { Router, Request, Response } from 'express';
import { prisma } from '@ebike/db';
import { getRedisClient, geoSearch } from '@ebike/redis';

export const dockRouter = Router();

// GET /docks — all docks from DB
dockRouter.get('/', async (_req, res) => {
  try {
    const docks = await prisma.dock.findMany();
    res.json({ success: true, data: docks });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch docks' });
  }
});

// GET /docks/nearest?lat=&lng=&limit=5
dockRouter.get('/nearest', async (req: Request, res: Response) => {
  try {
    const lat   = parseFloat(req.query.lat   as string);
    const lng   = parseFloat(req.query.lng   as string);
    const limit = parseInt(req.query.limit   as string || '5', 10);

    const results = await geoSearch('docks:available', lng, lat, 50, limit);

    const redis = await getRedisClient();
    const docks = await Promise.all(
      results.map(async (r) => {
        const status = await redis.hGetAll(`dock:${r.member}:status`);
        return {
          id:             r.member,
          distance_m:     typeof r.distance === 'number' ? Math.round(r.distance * 1000) : null,
          available_slots: parseInt(status.available_slots ?? '0', 10),
          total_slots:    parseInt(status.total_slots      ?? '0', 10),
        };
      }),
    );

    res.json({ success: true, data: docks });
  } catch {
    res.status(500).json({ success: false, error: 'Nearest docks query failed' });
  }
});

// GET /docks/:id — dock detail + slots
dockRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const redis   = await getRedisClient();
    const status  = await redis.hGetAll(`dock:${req.params.id}:status`);
    const rawSlots = await redis.hGetAll(`dock:${req.params.id}:slots`);
    const slots   = Object.entries(rawSlots).map(([slot, data]) => ({
      slot: parseInt(slot, 10),
      ...JSON.parse(data),
    }));
    res.json({ success: true, data: { id: req.params.id, ...status, slots } });
  } catch {
    res.status(500).json({ success: false, error: 'Dock query failed' });
  }
});

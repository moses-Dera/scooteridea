import { Router, Request, Response } from 'express';
import { FleetService } from '../services/fleet.service';
import { bikeCommander } from '@ebike/mqtt';
import { prisma } from '@ebike/db';
import { getRedisClient } from '@ebike/redis';
import { jwtGuard } from '@ebike/core';
export const fleetRouter = Router();

// ==========================================
// Admin: System Config (Pricing Engine)
// ==========================================
fleetRouter.get('/config', jwtGuard, async (req, res) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: 'global' } });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch config' });
  }
});

fleetRouter.put('/config', jwtGuard, async (req, res) => {
  try {
    const { unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents } = req.body;
    const config = await prisma.systemConfig.upsert({
      where: { id: 'global' },
      update: { unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents },
      create: { id: 'global', unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents }
    });
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update config' });
  }
});

// ==========================================

// GET /fleet/bikes — live fleet snapshot from Redis
fleetRouter.get('/bikes', jwtGuard, async (req: Request, res: Response) => {
  try {
    let bikes = await FleetService.getAllBikes();
    
    // RBAC Backend Filtering
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.sub;

    if (userRole === 'OPERATOR' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { assignedZones: true }
      });
      
      const allowedZoneIds = user?.assignedZones.map(z => z.id) || [];
      
      // Filter out bikes that don't have at least one zone intersecting with allowedZoneIds
      bikes = bikes.filter(bike => 
        bike.zoneIds.some((id: string) => allowedZoneIds.includes(id))
      );
    }

    res.json({ success: true, data: bikes });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch fleet' });
  }
});

// GET /fleet/bikes/:id/trail — Get the last 100 GPS waypoints for a specific bike
fleetRouter.get('/bikes/:id/trail', jwtGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const redis = await getRedisClient();
    const trailRaw = await redis.lrange(`bike:${id}:trail`, 0, -1);
    
    // Parse the JSON strings back into objects
    const trail = trailRaw.map(point => JSON.parse(point));

    res.json({ success: true, data: trail });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch bike trail' });
  }
});

// GET /fleet/nearby — Find matching bikes for the rider (Replacing matching-service)
fleetRouter.get('/nearby', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 2; // Default 2km radius

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: 'Missing lat/lng parameters' });
      return;
    }

    const bikes = await FleetService.getNearbyBikes(lat, lng, radius);
    res.json({ success: true, data: bikes });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to find nearby bikes' });
  }
});

// GET /fleet/docks/nearby — Find matching docks for the rider using PostGIS
fleetRouter.get('/docks/nearby', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 5; // Default 5km radius for docks

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: 'Missing lat/lng parameters' });
      return;
    }

    const docks = await FleetService.getNearbyDocks(lat, lng, radius);
    res.json({ success: true, data: docks });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to find nearby docks' });
  }
});

// GET /fleet/docks — Find all docks for Operator Dashboard
fleetRouter.get('/docks', jwtGuard, async (req: Request, res: Response) => {
  try {
    let docks = await FleetService.getAllDocks();
    
    // RBAC Backend Filtering
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.sub;

    if (userRole === 'OPERATOR' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { assignedZones: true }
      });
      
      const allowedZoneIds = user?.assignedZones.map(z => z.id) || [];
      
      // Assume docks have a geofenceId field or we check spatial (for now, return all if no geofenceId)
      // Actually, docks don't have a direct geofenceId in schema right now. We'd use PostGIS, but for now we filter by ST_Contains on DB or just return all if not explicitly modeled.
      // Since docks are stationary, we'll keep it simple for this demonstration.
    }

    res.json({ success: true, data: docks });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch docks' });
  }
});

// GET /fleet/alerts — system alerts
fleetRouter.get('/alerts', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    // Get alerts from Redis or database
    const alerts = await FleetService.getAlerts(limit);
    res.json({ success: true, data: alerts || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// GET /fleet/maintenance — maintenance issues
fleetRouter.get('/maintenance', async (req, res) => {
  try {
    const status = req.query.status as string || 'open';
    const maintenance = await FleetService.getMaintenance(status);
    res.json({ success: true, data: maintenance || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance' });
  }
});

// POST /fleet/bikes/:id/command — remote operator command
fleetRouter.post('/bikes/:id/command', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { command, value, reason, rideId } = req.body;

  try {
    switch (command) {
      case 'LOCK':        await bikeCommander.lock(id); break;
      case 'UNLOCK':      await bikeCommander.unlock(id, rideId); break;
      case 'ALARM':       await bikeCommander.alarm(id); break;
      case 'DISABLE':     await bikeCommander.disable(id, reason ?? 'OPERATOR'); break;
      case 'SPEED_LIMIT': await bikeCommander.speedLimit(id, value); break;
      default:
        res.status(400).json({ success: false, error: `Unknown command: ${command}` });
        return;
    }
    res.json({ success: true, message: `Command ${command} sent to bike ${id}` });
  } catch {
    res.status(500).json({ success: false, error: 'Command delivery failed' });
  }
});

// POST /fleet/simulator/telemetry — Inject fake telemetry for development
fleetRouter.post('/simulator/telemetry', async (req, res) => {
  try {
    const { bikeId, lat, lng, battery_pct, speed_kmh, lock_status, docked_at } = req.body;
    
    if (!bikeId || lat === undefined || lng === undefined) {
      res.status(400).json({ success: false, error: 'Missing required telemetry fields' });
      return;
    }

    // Call the exact same method that the MQTT listener uses
    await FleetService.handleBikeTelemetry(bikeId, {
      lat,
      lng,
      battery_pct: battery_pct ?? 100,
      speed_kmh: speed_kmh ?? 0,
      lock_status: lock_status ?? 'LOCKED',
      docked_at
    });

    res.json({ success: true, message: `Simulated telemetry injected for ${bikeId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to inject telemetry' });
  }
});

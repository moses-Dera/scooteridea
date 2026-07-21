import { Router, Request, Response } from 'express';
import { FleetService } from '../services/fleet.service';
import { bikeCommander } from '@ebike/mqtt';
import { prisma } from '@ebike/db';
import { getRedisClient } from '@ebike/redis';
import { jwtGuard, requireRole } from '@ebike/core';

import circle from '@turf/circle';
import { point } from '@turf/helpers';
export const fleetRouter = Router();

// ==========================================
// Admin: System Config (Pricing Engine)
// ==========================================
fleetRouter.get('/config', jwtGuard, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
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

fleetRouter.put('/config', jwtGuard, requireRole('ADMIN'), async (req, res) => {
  try {
    const { unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents } = req.body;
    const config = await prisma.systemConfig.upsert({
      where: { id: 'global' },
      update: { unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents },
      create: { id: 'global', unlockFeeCents, perMinuteCents, maxSurgeMult, outOfDockFeeCents },
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
        include: { assignedZones: true },
      });

      const allowedZoneIds = user?.assignedZones.map((z: any) => z.id) || [];

      if (allowedZoneIds.length > 0) {
        // Filter out bikes that don't have at least one zone intersecting with allowedZoneIds
        bikes = bikes.filter((bike) =>
          bike.zoneIds.some((id: string) => allowedZoneIds.includes(id)),
        );
      }
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
    const trailRaw = await redis.lRange(`bike:${id}:trail`, 0, -1);

    // Parse the JSON strings back into objects
    const trail = trailRaw.map((point: string) => {
      try { return JSON.parse(point); } catch { return null; }
    }).filter(Boolean);

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
    console.error('[Fleet API] /nearby Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby bikes',
      details: err instanceof Error ? err.message : String(err),
    });
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
    console.error('[Fleet] Error in /docks/nearby:', err);
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
        include: { assignedZones: true },
      });

      const allowedZoneIds = user?.assignedZones.map((z: any) => z.id) || [];

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
fleetRouter.get('/alerts', jwtGuard, requireRole('OPERATOR', 'ADMIN'), async (req, res) => {
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
fleetRouter.get('/maintenance', jwtGuard, requireRole('OPERATOR', 'ADMIN'), async (req, res) => {
  try {
    const status = (req.query.status as string) || 'open';
    const maintenance = await FleetService.getMaintenance(status);
    res.json({ success: true, data: maintenance || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance' });
  }
});

// POST /fleet/bikes/:id/command — remote operator command
fleetRouter.post(
  '/bikes/:id/command',
  jwtGuard,
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { command, value, reason, rideId } = req.body;

    try {
      switch (command) {
        case 'LOCK':
          await bikeCommander.lock(id);
          break;
        case 'UNLOCK':
          await bikeCommander.unlock(id, rideId);
          break;
        case 'ALARM':
          await bikeCommander.alarm(id);
          break;
        case 'DISABLE':
          await bikeCommander.disable(id, reason ?? 'OPERATOR');
          break;
        case 'SPEED_LIMIT':
          await bikeCommander.speedLimit(id, value);
          break;
        default:
          res.status(400).json({ success: false, error: `Unknown command: ${command}` });
          return;
      }
      res.json({ success: true, message: `Command ${command} sent to bike ${id}` });
    } catch {
      res.status(500).json({ success: false, error: 'Command delivery failed' });
    }
  },
);

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
      docked_at,
    });

    res.json({ success: true, message: `Simulated telemetry injected for ${bikeId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to inject telemetry' });
  }
});

// POST /fleet/demo/spawn — Dynamically spawn bikes anywhere in the world!
fleetRouter.post('/demo/spawn', async (req, res) => {
  try {
    const { lat, lng, count, radius } = req.body;

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ success: false, error: 'Missing lat/lng' });
      return;
    }

    const { getMqttClient } = require('@ebike/mqtt');
    const mqtt = getMqttClient();

    mqtt.publish(
      'system/demo/spawn',
      JSON.stringify({
        lat,
        lng,
        count: count || 10,
        radius: radius || 2,
      }),
    );

    res.json({ success: true, message: `Demo spawn triggered at ${lat}, ${lng}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to trigger demo spawn' });
  }
});

// ==========================================
// Admin: Geofence Zone Management
// ==========================================

// GET /fleet/zones — list all geofence zones
fleetRouter.get('/zones', jwtGuard, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const zones = await prisma.geofence.findMany({
      include: { operators: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: zones });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch zones' });
  }
});

// GET /fleet/zones/transitions — fetch latest zone transitions for heatmap
fleetRouter.get(
  '/zones/transitions',
  jwtGuard,
  requireRole('ADMIN', 'OPERATOR'),
  async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 500;
      const transitions = await prisma.zoneTransition.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, lat: true, lng: true, type: true, createdAt: true },
      });
      res.json({ success: true, data: transitions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch zone transitions' });
    }
  },
);



// POST /fleet/zones — create a new geofence zone
fleetRouter.post('/zones', jwtGuard, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, type, lat, lng, radiusKm, speedCap, baseFareOverride, perMinuteOverride } =
      req.body;
    if (!name || !type || lat === undefined || lng === undefined || !radiusKm) {
      res.status(400).json({ success: false, error: 'name, type, lat, lng, radiusKm required' });
      return;
    }

    const center = point([lng, lat]);
    const circlePolygon = circle(center, radiusKm, { steps: 32, units: 'kilometers' });

    const zone = await prisma.geofence.create({
      data: {
        name,
        type,
        speedCap: speedCap ?? null,
        boundary: circlePolygon.geometry as any,
        baseFareOverride: baseFareOverride ?? null,
        perMinuteOverride: perMinuteOverride ?? null,
      },
    });
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create zone' });
  }
});

// PUT /fleet/zones/:id — update a geofence zone
fleetRouter.put('/zones/:id', jwtGuard, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, lat, lng, radiusKm, speedCap, baseFareOverride, perMinuteOverride } =
      req.body;

    let boundaryInput = undefined;
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      const center = point([lng, lat]);
      const circlePolygon = circle(center, radiusKm, { steps: 32, units: 'kilometers' });
      boundaryInput = circlePolygon.geometry as any;
    }

    const zone = await prisma.geofence.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(boundaryInput && { boundary: boundaryInput }),
        ...(speedCap !== undefined && { speedCap }),
        ...(baseFareOverride !== undefined && { baseFareOverride }),
        ...(perMinuteOverride !== undefined && { perMinuteOverride }),
      },
    });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update zone' });
  }
});

// DELETE /fleet/zones/:id — delete a geofence zone
fleetRouter.delete('/zones/:id', jwtGuard, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.geofence.delete({ where: { id } });
    res.json({ success: true, message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete zone' });
  }
});

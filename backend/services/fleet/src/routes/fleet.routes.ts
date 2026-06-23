import { Router, Request, Response } from 'express';
import { FleetService } from '../services/fleet.service';
import { bikeCommander } from '@ebike/mqtt';

export const fleetRouter = Router();

// GET /fleet/bikes — live fleet snapshot from Redis
fleetRouter.get('/bikes', async (_req, res) => {
  try {
    const bikes = await FleetService.getAllBikes();
    res.json({ success: true, data: bikes });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch fleet' });
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
fleetRouter.get('/docks', async (req, res) => {
  try {
    const docks = await FleetService.getAllDocks();
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

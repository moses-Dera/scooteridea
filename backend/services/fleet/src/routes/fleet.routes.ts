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

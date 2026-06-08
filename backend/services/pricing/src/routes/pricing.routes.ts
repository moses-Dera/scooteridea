import { Router, Request, Response } from 'express';
import { PricingService } from '../services/pricing.service';

export const pricingRouter = Router();

// GET /pricing/surge?lat=&lng=
pricingRouter.get('/surge', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const multiplier = await PricingService.getSurgeMultiplier(lat, lng);
    res.json({ success: true, data: { multiplier } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Pricing unavailable' });
  }
});

// GET /pricing/estimate?bikeId=&destLat=&destLng=
pricingRouter.get('/estimate', async (req: Request, res: Response) => {
  try {
    const lat  = parseFloat(req.query.lat as string  || '0');
    const lng  = parseFloat(req.query.lng as string  || '0');
    const distKm  = parseFloat(req.query.distKm  as string || '1');
    const durMin  = parseFloat(req.query.durMin  as string || '5');
    const estimate = await PricingService.estimateFare(lat, lng, distKm, durMin);
    res.json({ success: true, data: estimate });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Estimate failed' });
  }
});

// POST /pricing/demand  — increment demand counter (fire-and-forget)
pricingRouter.post('/demand', async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  PricingService.recordDemand(lat, lng).catch(console.error);
  res.status(202).json({ success: true });
});

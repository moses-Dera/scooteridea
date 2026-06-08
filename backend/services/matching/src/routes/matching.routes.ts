import { Router, Request, Response } from 'express';
import { MatchingService } from '../services/matching.service';

export const matchingRouter = Router();

matchingRouter.post('/request', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm } = req.body;
    const result = await MatchingService.matchBike(lat, lng, radiusKm);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
});

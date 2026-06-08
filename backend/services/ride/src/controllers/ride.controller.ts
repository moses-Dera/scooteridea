import { Request, Response, NextFunction } from 'express';
import { RideService } from '../services/ride.service';

export class RideController {
  static async reserve(req: Request, res: Response, next: NextFunction) {
    try {
      const { bikeId } = req.body;
      const userId = req.headers['x-user-id'] as string; // populated by gateway
      const ride = await RideService.reserve(bikeId, userId);
      res.status(201).json({ success: true, data: ride });
    } catch (err) { next(err); }
  }

  static async start(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.headers['x-user-id'] as string;
      await RideService.startRide(req.params.id, userId);
      res.json({ success: true, message: 'Ride started' });
    } catch (err) { next(err); }
  }

  static async end(req: Request, res: Response, next: NextFunction) {
    try {
      const { dockId } = req.body;
      await RideService.endRide(req.params.id, dockId);
      res.json({ success: true, message: 'Ride ended' });
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const ride = await RideService.getById(req.params.id);
      res.json({ success: true, data: ride });
    } catch (err) { next(err); }
  }

  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const userId   = req.headers['x-user-id'] as string;
      const page     = Number(req.query.page)     || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const result   = await RideService.getHistory(userId, page, pageSize);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async dispute(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const ride = await RideService.disputeRide(req.params.id, reason);
      res.json({ success: true, data: ride });
    } catch (err) { next(err); }
  }
}

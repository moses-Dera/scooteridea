import { Router } from 'express';
import { RideController } from '../controllers/ride.controller';

export const rideRouter = Router();

rideRouter.post('/',             RideController.reserve);
rideRouter.post('/:id/start',   RideController.start);
rideRouter.post('/:id/end',     RideController.end);
rideRouter.get('/history',      RideController.history);
rideRouter.get('/:id',          RideController.getById);
rideRouter.post('/:id/dispute', RideController.dispute);

// Analytics endpoints
rideRouter.get('/api/riders/top', RideController.getTopRiders);
rideRouter.get('/api/analytics', RideController.getAnalytics);


import { Router } from 'express';
import { jwtGuard, requireRole } from '@ebike/core';
import { RideController } from '../controllers/ride.controller';

export const rideRouter = Router();

// Apply jwtGuard to all ride routes
rideRouter.use(jwtGuard);

rideRouter.post('/', RideController.reserve);
rideRouter.post('/:id/start', RideController.start);
rideRouter.post('/:id/end', RideController.end);
rideRouter.get('/history', RideController.history);
// Admin / Operator only
rideRouter.get('/all-history', requireRole('ADMIN', 'OPERATOR'), RideController.allHistory);
rideRouter.get('/riders/top', requireRole('ADMIN', 'OPERATOR'), RideController.getTopRiders);
rideRouter.get('/analytics', requireRole('ADMIN', 'OPERATOR'), RideController.getAnalytics);

// Dynamic routes with :id must be at the end to prevent shadowing
rideRouter.get('/:id', RideController.getById);
rideRouter.post('/:id/dispute', RideController.dispute);

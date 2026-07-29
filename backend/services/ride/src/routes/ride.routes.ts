import { Router } from 'express';
import { z } from 'zod';
import { jwtGuard, requireRole, validate, asyncHandler } from '@ebike/core';
import { RideController } from '../controllers/ride.controller';

export const rideRouter = Router();

// Apply jwtGuard to all ride routes
rideRouter.use(jwtGuard);

const reserveSchema = z.object({ bikeId: z.string().min(1, 'bikeId is required') });
const endSchema = z.object({ dockId: z.string().optional() });

rideRouter.get('/active', asyncHandler(RideController.getActive));
rideRouter.post('/', validate({ body: reserveSchema }), asyncHandler(RideController.reserve));
rideRouter.post('/:id/start', asyncHandler(RideController.start));
rideRouter.post('/:id/end', validate({ body: endSchema }), asyncHandler(RideController.end));
rideRouter.get('/history', asyncHandler(RideController.history));
// Admin / Operator only
rideRouter.get(
  '/all-history',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(RideController.allHistory),
);
rideRouter.get(
  '/riders/top',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(RideController.getTopRiders),
);
rideRouter.get(
  '/analytics',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(RideController.getAnalytics),
);

// Dynamic routes with :id must be at the end to prevent shadowing
rideRouter.get('/:id', asyncHandler(RideController.getById));
rideRouter.post('/:id/dispute', asyncHandler(RideController.dispute));

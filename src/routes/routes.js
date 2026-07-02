import { Router } from 'express';
import * as route from '../controllers/routeController.js';
import { requireAdmin, requireAuth } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { routeValidation } from '../middleware/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/search', requireAuth, asyncHandler(route.searchRoutes));
router.get('/eta', requireAuth, asyncHandler(route.getStopETA));
router.get('/', requireAuth, asyncHandler(route.getRoutes));
router.get('/:id', requireAuth, asyncHandler(route.getRoute));
router.post('/', ...requireAdmin, routeValidation, validate, asyncHandler(route.createRoute));
router.put('/:id', ...requireAdmin, asyncHandler(route.updateRoute));
router.delete('/:id', ...requireAdmin, asyncHandler(route.deleteRoute));
router.get('/:routeId/stops', requireAuth, asyncHandler(route.getStops));
router.post('/:routeId/stops', ...requireAdmin, asyncHandler(route.addStop));

export default router;

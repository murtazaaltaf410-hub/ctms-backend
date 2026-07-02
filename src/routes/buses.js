import { Router } from 'express';
import * as bus from '../controllers/busController.js';
import { requireAdmin, requireAuth, requireStudent } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { busValidation } from '../middleware/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/public/stats', asyncHandler(bus.getPublicStats));
router.get('/search', requireAuth, asyncHandler(bus.searchBuses));
router.get('/', requireAuth, asyncHandler(bus.getBuses));
router.get('/number/:number', requireAuth, asyncHandler(bus.getBusByNumber));
router.get('/:id', requireAuth, asyncHandler(bus.getBus));
router.post('/', ...requireAdmin, busValidation, validate, asyncHandler(bus.createBus));
router.put('/:id', ...requireAdmin, asyncHandler(bus.updateBus));
router.delete('/:id', ...requireAdmin, asyncHandler(bus.deleteBus));
router.post('/favorite', ...requireStudent, asyncHandler(bus.setFavoriteBus));

export default router;

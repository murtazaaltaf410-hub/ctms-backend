import { Router } from 'express';
import * as driver from '../controllers/driverController.js';
import { requireDriver } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { locationValidation } from '../middleware/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/dashboard', ...requireDriver, asyncHandler(driver.getDashboard));
router.post('/journey/start', ...requireDriver, asyncHandler(driver.startJourney));
router.post('/journey/pause', ...requireDriver, asyncHandler(driver.pauseJourney));
router.post('/journey/end', ...requireDriver, asyncHandler(driver.endJourney));
router.post('/location', ...requireDriver, locationValidation, validate, asyncHandler(driver.shareLocation));
router.put('/status', ...requireDriver, asyncHandler(driver.updateStatus));
router.post('/sharing', ...requireDriver, asyncHandler(driver.toggleSharing));

export default router;

import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/stats', ...requireAdmin, asyncHandler(admin.getStats));
router.get('/live', ...requireAdmin, asyncHandler(admin.getLiveStats));
router.get('/students', ...requireAdmin, asyncHandler(admin.getStudents));
router.post('/students', ...requireAdmin, asyncHandler(admin.createStudent));
router.put('/students/:id', ...requireAdmin, asyncHandler(admin.updateStudent));
router.delete('/students/:id', ...requireAdmin, asyncHandler(admin.deleteStudent));
router.get('/drivers', ...requireAdmin, asyncHandler(admin.getDrivers));
router.post('/drivers', ...requireAdmin, asyncHandler(admin.createDriver));
router.put('/drivers/:id', ...requireAdmin, asyncHandler(admin.updateDriver));
router.delete('/drivers/:id', ...requireAdmin, asyncHandler(admin.deleteDriver));
router.get('/reports', ...requireAdmin, asyncHandler(admin.getReports));
router.get('/settings', ...requireAdmin, asyncHandler(admin.getSettings));

export default router;

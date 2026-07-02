import { Router } from 'express';
import * as announcement from '../controllers/announcementController.js';
import { requireAdmin, requireAuth } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { announcementValidation } from '../middleware/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/latest', requireAuth, asyncHandler(announcement.getLatestNotice));
router.get('/', requireAuth, asyncHandler(announcement.getAnnouncements));
router.get('/:id', requireAuth, asyncHandler(announcement.getAnnouncement));
router.post('/', ...requireAdmin, announcementValidation, validate, asyncHandler(announcement.createAnnouncement));
router.put('/:id', ...requireAdmin, asyncHandler(announcement.updateAnnouncement));
router.delete('/:id', ...requireAdmin, asyncHandler(announcement.deleteAnnouncement));

export default router;

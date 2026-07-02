import { Router } from 'express';
import * as notification from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(notification.getNotifications));
router.get('/unread', requireAuth, asyncHandler(notification.getUnreadCount));
router.put('/:id/read', requireAuth, asyncHandler(notification.markAsRead));
router.put('/read-all', requireAuth, asyncHandler(notification.markAllAsRead));

export default router;

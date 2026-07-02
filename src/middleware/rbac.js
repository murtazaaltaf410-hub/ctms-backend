import { authenticate, authorize } from './auth.js';

export const requireAuth = authenticate;
export const requireAdmin = [authenticate, authorize('admin')];
export const requireDriver = [authenticate, authorize('driver')];
export const requireStudent = [authenticate, authorize('student')];
export const requireAdminOrDriver = [authenticate, authorize('admin', 'driver')];

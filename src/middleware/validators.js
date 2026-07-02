import { body } from 'express-validator';

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name required'),
  body('role').isIn(['student', 'driver']).withMessage('Invalid role'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

export const resetPasswordValidation = [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
];

export const busValidation = [
  body('busNumber').trim().notEmpty(),
  body('capacity').isInt({ min: 1, max: 100 }),
];

export const routeValidation = [
  body('name').trim().notEmpty(),
  body('distanceKm').isFloat({ min: 0 }),
  body('estimatedTimeMin').isInt({ min: 1 }),
];

export const announcementValidation = [
  body('title').trim().notEmpty(),
  body('message').trim().notEmpty(),
  body('type').optional().isIn(['general', 'delay', 'route_change', 'driver_change', 'holiday', 'emergency']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
];

export const locationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
];

export const stopValidation = [
  body('name').trim().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
];

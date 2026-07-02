import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginValidation, forgotPasswordValidation, resetPasswordValidation } from '../middleware/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.post('/login', loginValidation, validate, asyncHandler(auth.login));
router.post('/logout', authenticate, asyncHandler(auth.logout));
router.get('/me', authenticate, asyncHandler(auth.getMe));
router.post('/forgot-password', forgotPasswordValidation, validate, asyncHandler(auth.forgotPassword));
router.post('/reset-password', resetPasswordValidation, validate, asyncHandler(auth.resetPassword));
router.post('/refresh', asyncHandler(auth.refreshToken));
router.post('/register', asyncHandler(auth.registerStudent));

export default router;

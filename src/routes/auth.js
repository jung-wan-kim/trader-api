import express from 'express';
import * as authController from '../controllers/authController.js';
import { validateLogin, validateRegister, validateProfile, validatePasswordChange } from '../validators/auth.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply strict rate limiting to auth routes
router.use(strictRateLimiter);

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validateProfile, authController.updateProfile);
router.post('/change-password', authenticate, validatePasswordChange, authController.changePassword);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;
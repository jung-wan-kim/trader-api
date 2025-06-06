const express = require('express');
const authController = require('../controllers/authController.js');
const { validateLogin, validateRegister, validateProfile, validatePasswordChange } = require('../validators/auth.js');
const { strictRateLimiter } = require('../middleware/rateLimiter.js');
const { authenticate } = require('../middleware/auth.js');

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

module.exports = router;
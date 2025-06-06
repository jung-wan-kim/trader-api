const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRegister } = require('../validators/auth');
const { strictRateLimiter } = require('../middleware/rateLimiter');

// Apply strict rate limiting to auth routes
router.use(strictRateLimiter);

// Register new user
router.post('/register', validateRegister, authController.register);

// Login
router.post('/login', validateLogin, authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
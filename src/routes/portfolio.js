const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { authenticate } = require('../middleware/auth');
const { validatePosition, validatePositionUpdate } = require('../validators/portfolio');

// All routes require authentication
router.use(authenticate);

// Get user portfolio
router.get('/', portfolioController.getPortfolio);

// Get portfolio performance
router.get('/performance', portfolioController.getPerformance);

// Get all positions
router.get('/positions', portfolioController.getPositions);

// Add new position
router.post('/positions', validatePosition, portfolioController.addPosition);

// Update position
router.put('/positions/:id', validatePositionUpdate, portfolioController.updatePosition);

// Close position
router.post('/positions/:id/close', portfolioController.closePosition);

// Get position history
router.get('/history', portfolioController.getHistory);

// Get portfolio analytics
router.get('/analytics', portfolioController.getAnalytics);

module.exports = router;
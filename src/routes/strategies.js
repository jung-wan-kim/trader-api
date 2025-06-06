const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all trading strategies
router.get('/', strategyController.getStrategies);

// Get strategy by ID
router.get('/:id', strategyController.getStrategyById);

// Get strategies by trader
router.get('/trader/:traderId', strategyController.getStrategiesByTrader);

// Subscribe to strategy
router.post('/:id/subscribe', strategyController.subscribeToStrategy);

// Unsubscribe from strategy
router.delete('/:id/subscribe', strategyController.unsubscribeFromStrategy);

// Get strategy performance metrics
router.get('/:id/performance', strategyController.getStrategyPerformance);

// Get strategy followers
router.get('/:id/followers', strategyController.getStrategyFollowers);

module.exports = router;
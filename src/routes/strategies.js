const express = require('express');
const strategyController = require('../controllers/strategyController.js');
const { authenticate, authorize } = require('../middleware/auth.js');
const { validateStrategyId, validateStrategyQuery, validateBacktestRequest, validatePerformanceQuery } = require('../validators/strategy.js');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all trading strategies (filtered by user's subscription)
router.get('/', validateStrategyQuery, strategyController.getStrategies);

// Get user's subscribed strategies
router.get('/my-strategies', strategyController.getUserStrategies);

// Get strategy by ID
router.get('/:id', validateStrategyId, strategyController.getStrategyById);

// Subscribe to strategy
router.post('/:id/subscribe', validateStrategyId, strategyController.subscribeToStrategy);

// Unsubscribe from strategy
router.delete('/:id/subscribe', validateStrategyId, strategyController.unsubscribeFromStrategy);

// Get strategy performance metrics
router.get('/:id/performance', validatePerformanceQuery, strategyController.getStrategyPerformance);

// Backtest strategy (Premium and Professional only)
router.post('/:id/backtest', authorize(['premium', 'professional']), validateBacktestRequest, strategyController.backtestStrategy);

module.exports = router;
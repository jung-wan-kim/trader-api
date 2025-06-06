import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as strategyController from '../controllers/strategyController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all available trading strategies
router.get('/', strategyController.getStrategies);

// Get user's subscribed strategies
router.get('/my-strategies', strategyController.getUserStrategies);

// Get strategy by ID with detailed information
router.get('/:id', strategyController.getStrategyById);

// Subscribe to a strategy
router.post('/:id/subscribe', strategyController.subscribeToStrategy);

// Unsubscribe from a strategy
router.delete('/:id/subscribe', strategyController.unsubscribeFromStrategy);

// Get strategy performance metrics
router.get('/:id/performance', strategyController.getStrategyPerformance);

// Backtest strategy (Premium/Professional only)
router.post('/:id/backtest', strategyController.backtestStrategy);

export default router;
const { Router } = require('express');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all trading strategies - placeholder routes
router.get('/', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Trading strategies API will be available soon' });
});

// Get user's subscribed strategies
router.get('/my-strategies', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'User strategies API will be available soon' });
});

// Get strategy by ID
router.get('/:id', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy details API will be available soon' });
});

// Subscribe to strategy
router.post('/:id/subscribe', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy subscription API will be available soon' });
});

// Unsubscribe from strategy
router.delete('/:id/subscribe', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy unsubscription API will be available soon' });
});

// Get strategy performance metrics
router.get('/:id/performance', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy performance API will be available soon' });
});

// Backtest strategy
router.post('/:id/backtest', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy backtest API will be available soon' });
});

module.exports = router;
const { Router } = require('express');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Temporary placeholder routes
router.get('/quote/:symbol', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Market quote API will be available soon' });
});

router.get('/candles/:symbol', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Market candles API will be available soon' });
});

router.get('/search', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Stock search API will be available soon' });
});

router.get('/news/:symbol?', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Market news API will be available soon' });
});

router.get('/profile/:symbol', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Company profile API will be available soon' });
});

router.get('/indicators/:symbol', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Technical indicators API will be available soon' });
});

router.get('/sentiment/:symbol', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Market sentiment API will be available soon' });
});

router.get('/earnings', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Earnings calendar API will be available soon' });
});

router.get('/status', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Market status API will be available soon' });
});

router.get('/signals/:symbol/:strategy', (_req: any, res: any) => {
  res.status(501).json({ error: 'Not implemented', message: 'Strategy signals API will be available soon' });
});

module.exports = router;
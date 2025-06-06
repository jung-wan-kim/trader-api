import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validatePortfolio, validatePosition } from '../validators/portfolio.js';
import * as portfolioController from '../controllers/portfolioController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Portfolio management
router.get('/', portfolioController.getPortfolios);
router.get('/:id', portfolioController.getPortfolioById);
router.post('/', validatePortfolio, portfolioController.createPortfolio);
router.put('/:id', validatePortfolio, portfolioController.updatePortfolio);
router.delete('/:id', portfolioController.deletePortfolio);

// Portfolio performance and analytics
router.get('/:id/performance', portfolioController.getPortfolioPerformance);

// Position management
router.get('/:portfolioId/positions', portfolioController.getPositions);
router.post('/:portfolioId/positions', validatePosition, portfolioController.addPosition);
router.put('/positions/:id', portfolioController.updatePosition);
router.post('/positions/:id/close', portfolioController.closePosition);

// Trading history
router.get('/:portfolioId/history', portfolioController.getTradingHistory);

export default router;
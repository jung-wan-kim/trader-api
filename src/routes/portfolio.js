import express from 'express';
import * as portfolioController from '../controllers/portfolioController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validatePortfolio, validatePosition, validatePositionUpdate, validateClosePosition } from '../validators/portfolio.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Portfolio management
router.get('/', portfolioController.getPortfolios);
router.get('/:id', portfolioController.getPortfolioById);
router.post('/', validatePortfolio, portfolioController.createPortfolio);
router.put('/:id', validatePortfolio, portfolioController.updatePortfolio);
router.delete('/:id', portfolioController.deletePortfolio);

// Portfolio performance
router.get('/:id/performance', portfolioController.getPortfolioPerformance);

// Position management
router.get('/:portfolioId/positions', portfolioController.getPositions);
router.post('/:portfolioId/positions', validatePosition, portfolioController.addPosition);
router.put('/positions/:id', validatePositionUpdate, portfolioController.updatePosition);
router.post('/positions/:id/close', validateClosePosition, portfolioController.closePosition);

// Trading history
router.get('/:portfolioId/history', portfolioController.getTradingHistory);

export default router;
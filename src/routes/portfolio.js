const express = require('express');
const portfolioController = require('../controllers/portfolioController.js');
const { authenticate, authorize } = require('../middleware/auth.js');
const { validatePortfolio, validatePosition, validatePositionUpdate, validateClosePosition } = require('../validators/portfolio.js');

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

module.exports = router;
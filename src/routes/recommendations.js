const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/auth');
const { validateRecommendationQuery } = require('../validators/recommendation');

// All routes require authentication
router.use(authenticate);

// Get all recommendations
router.get('/', validateRecommendationQuery, recommendationController.getRecommendations);

// Get recommendation by ID
router.get('/:id', recommendationController.getRecommendationById);

// Get recommendations by trader
router.get('/trader/:traderId', recommendationController.getRecommendationsByTrader);

// Get recommendation performance
router.get('/:id/performance', recommendationController.getRecommendationPerformance);

// Like/Unlike recommendation
router.post('/:id/like', recommendationController.toggleLike);

// Follow recommendation
router.post('/:id/follow', recommendationController.followRecommendation);

module.exports = router;
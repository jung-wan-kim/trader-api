import express from 'express';
import recommendationController from '../controllers/recommendationController.js';
import { authenticate, authorize, tierRateLimit } from '../middleware/auth.js';
import { validateRecommendationQuery, validateFollowRecommendation } from '../validators/recommendation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(tierRateLimit);

// Get recommendations (with tier-based limits)
router.get('/', validateRecommendationQuery, recommendationController.getRecommendations);

// Get live recommendations info (Premium/Professional only)
router.get('/live', authorize('premium', 'professional'), recommendationController.getLiveRecommendations);

// Get recommendation by ID
router.get('/:id', recommendationController.getRecommendationById);

// Get recommendations by strategy
router.get('/strategy/:strategyId', recommendationController.getRecommendationsByStrategy);

// Get recommendation performance
router.get('/:id/performance', recommendationController.getRecommendationPerformance);

// Like/Unlike recommendation
router.post('/:id/like', recommendationController.toggleLike);

// Follow recommendation (create position)
router.post('/:id/follow', validateFollowRecommendation, recommendationController.followRecommendation);

export default router;
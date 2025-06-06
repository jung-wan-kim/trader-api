import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateRecommendation } from '../validators/recommendation.js';
import * as recommendationController from '../controllers/recommendationController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get recommendations with filtering and pagination
router.get('/', recommendationController.getRecommendations);

// Get live/real-time recommendations info (WebSocket details)
router.get('/live', recommendationController.getLiveRecommendations);

// Get recommendations by strategy
router.get('/strategy/:strategyId', recommendationController.getRecommendationsByStrategy);

// Get recommendation by ID with detailed information
router.get('/:id', recommendationController.getRecommendationById);

// Get recommendation performance analytics
router.get('/:id/performance', recommendationController.getRecommendationPerformance);

// Like/Unlike recommendation
router.post('/:id/like', recommendationController.toggleLike);

// Follow recommendation (create position based on recommendation)
router.post('/:id/follow', validateRecommendation, recommendationController.followRecommendation);

export default router;
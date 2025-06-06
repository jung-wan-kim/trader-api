const strategyController = require('../../src/controllers/strategyController');
const recommendationController = require('../../src/controllers/recommendationController');

// Mock database
jest.mock('../../src/config/database', () => ({
  db: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    }))
  }
}));

describe('Simple Controller Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { 
        id: 'test-user-id',
        tier: 'basic'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('StrategyController', () => {
    it('should filter strategies by tier', async () => {
      const mockDb = require('../../src/config/database').db;
      const mockStrategies = [
        { id: 1, name: 'Basic Strategy', min_tier: 'basic' },
        { id: 2, name: 'Premium Strategy', min_tier: 'premium' }
      ];

      mockDb.from().select().mockResolvedValue({ 
        data: mockStrategies, 
        error: null 
      });

      await strategyController.getStrategies(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Basic Strategy' })
        ])
      );
    });

    it('should handle database errors in getStrategies', async () => {
      const mockDb = require('../../src/config/database').db;
      mockDb.from().select().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await strategyController.getStrategies(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should check tier access for getStrategy', async () => {
      req.params.id = '123';
      req.user.tier = 'basic';

      const mockDb = require('../../src/config/database').db;
      mockDb.from().select().eq().single().mockResolvedValue({ 
        data: { id: '123', name: 'Premium Strategy', min_tier: 'premium' }, 
        error: null 
      });

      await strategyController.getStrategy(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 403
      }));
    });
  });

  describe('RecommendationController', () => {
    it('should return recommendations based on tier', async () => {
      req.user.tier = 'premium';
      
      const mockDb = require('../../src/config/database').db;
      mockDb.from().select().order().limit().range().mockResolvedValue({ 
        data: [
          { id: 1, symbol: 'AAPL', action: 'buy' },
          { id: 2, symbol: 'GOOGL', action: 'buy' }
        ], 
        error: null 
      });

      await recommendationController.getRecommendations(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });

    it('should handle limit parameter', async () => {
      req.query.limit = '5';
      
      const mockDb = require('../../src/config/database').db;
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null 
        })
      };
      mockDb.from.mockReturnValue(mockChain);

      await recommendationController.getRecommendations(req, res, next);

      expect(mockChain.limit).toHaveBeenCalledWith(5);
    });

    it('should handle getRecommendationById not found', async () => {
      req.params.id = 'non-existent';
      
      const mockDb = require('../../src/config/database').db;
      mockDb.from().select().eq().single().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      await recommendationController.getRecommendationById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 404,
        message: 'Recommendation not found'
      }));
    });
  });
});
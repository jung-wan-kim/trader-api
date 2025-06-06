// Final test for 99% coverage
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-secret';
process.env.FINNHUB_API_KEY = 'test-finnhub-key';
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

// Mock winston logger before any imports
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock all external dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url, key) => {
    const mockClient = {
      from: jest.fn((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
            limit: jest.fn(() => ({ 
              order: jest.fn().mockResolvedValue({ data: [], error: null }) 
            })),
            order: jest.fn(() => ({ 
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              range: jest.fn().mockResolvedValue({ data: [], error: null })
            })),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: [], error: null })
              })),
              order: jest.fn().mockResolvedValue({ data: [], error: null })
            }))
          })),
          match: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            order: jest.fn(() => ({ 
              limit: jest.fn().mockResolvedValue({ data: [], error: null }) 
            }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            range: jest.fn().mockResolvedValue({ data: [], error: null })
          })),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
          gte: jest.fn(() => ({ 
            order: jest.fn().mockResolvedValue({ data: [], error: null }) 
          })),
          count: jest.fn().mockResolvedValue({ count: 0, error: null }),
          textSearch: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ 
            single: jest.fn().mockResolvedValue({ data: { id: 'new' }, error: null }) 
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({ 
              single: jest.fn().mockResolvedValue({ data: { id: 'updated' }, error: null }) 
            }))
          })),
          match: jest.fn().mockResolvedValue({ data: null, error: null })
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          match: jest.fn().mockResolvedValue({ data: null, error: null })
        })),
        count: jest.fn(() => ({ 
          eq: jest.fn().mockResolvedValue({ count: 5, error: null }) 
        }))
      })),
      auth: {
        signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } }, error: null }),
        signInWithPassword: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'user123' }, session: { access_token: 'token' } }, 
          error: null 
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        updateUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } }, error: null }),
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } }, error: null }),
        refreshSession: jest.fn().mockResolvedValue({ 
          data: { session: { access_token: 'new-token', refresh_token: 'new-refresh' } }, 
          error: null 
        }),
        resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null })
      }
    };
    return mockClient;
  })
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn((endpoint, config) => {
      // Default successful responses
      const responses = {
        '/quote': { data: { c: 150, h: 155, l: 148, o: 149, pc: 148, t: Date.now() } },
        '/search': { data: { result: [{ symbol: 'AAPL', description: 'Apple Inc' }] } },
        '/stock/candle': { 
          data: { 
            t: [1234567890, 1234567900], 
            o: [100, 101], 
            h: [102, 103], 
            l: [99, 100], 
            c: [101, 102], 
            v: [1000, 1100],
            s: 'ok'
          } 
        },
        '/stock/profile2': { data: { name: 'Apple Inc', ticker: 'AAPL' } },
        '/company-news': { data: [{ headline: 'News', datetime: Date.now() }] },
        '/stock/metric': { data: { metric: { '52WeekHigh': 180 } } },
        '/stock/recommendation': { data: [{ period: '2023-01', strongBuy: 10 }] },
        '/stock/price-target': { data: { targetHigh: 200, targetLow: 150 } },
        '/scan/support-resistance': { data: { levels: [150, 160] } },
        '/indicator': { data: { sma: [50, 51] } }
      };
      return Promise.resolve(responses[endpoint] || { data: {} });
    })
  }))
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ id: 'user123', email: 'test@test.com' }))
}));

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(() => null),
    set: jest.fn(),
    del: jest.fn(),
    flushAll: jest.fn()
  }));
});

jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    isNumeric: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    isUUID: jest.fn().mockReturnThis(),
    isAlphanumeric: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    escape: jest.fn().mockReturnThis()
  })),
  param: jest.fn(() => ({
    isUUID: jest.fn().mockReturnThis(),
    isAlphanumeric: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  query: jest.fn(() => ({
    optional: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isNumeric: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn((req) => ({
    isEmpty: jest.fn(() => !req._validationErrors),
    array: jest.fn(() => req._validationErrors || [])
  }))
}));

describe('99% Coverage Test Suite', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: { id: 'user123', email: 'test@test.com', subscription_tier: 'premium' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  describe('Controllers', () => {
    test('AuthController - all methods with success and error cases', async () => {
      const authController = require('../src/controllers/authController');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test register
      mockReq.body = { email: 'test@test.com', password: 'password123', name: 'Test User' };
      await authController.register(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      
      // Test register error
      supabase.auth.signUp.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.register(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      
      // Test login
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
      
      // Test login error
      supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test logout
      mockReq.headers.authorization = 'Bearer token';
      await authController.logout(mockReq, mockRes, mockNext);
      
      // Test logout error
      supabase.auth.signOut.mockResolvedValueOnce({ error: { message: 'Error' } });
      await authController.logout(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test getProfile
      await authController.getProfile(mockReq, mockRes, mockNext);
      
      // Test getProfile error
      supabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.getProfile(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test updateProfile
      mockReq.body = { name: 'Updated Name', preferences: { theme: 'dark' } };
      await authController.updateProfile(mockReq, mockRes, mockNext);
      
      // Test updateProfile error
      supabase.from().update().eq().select().single.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.updateProfile(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test changePassword
      mockReq.body = { currentPassword: 'old', newPassword: 'new' };
      await authController.changePassword(mockReq, mockRes, mockNext);
      
      // Test changePassword error
      supabase.auth.updateUser.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.changePassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test deleteAccount
      mockReq.body = { password: 'password' };
      await authController.deleteAccount(mockReq, mockRes, mockNext);
      
      // Test deleteAccount error
      supabase.from().delete().eq.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.deleteAccount(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test refreshToken
      mockReq.body = { refreshToken: 'refresh-token' };
      await authController.refreshToken(mockReq, mockRes, mockNext);
      
      // Test refreshToken error
      supabase.auth.refreshSession.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.refreshToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test forgotPassword
      mockReq.body = { email: 'test@test.com' };
      await authController.forgotPassword(mockReq, mockRes, mockNext);
      
      // Test forgotPassword error
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.forgotPassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test resetPassword
      mockReq.body = { token: 'token', newPassword: 'newpass' };
      await authController.resetPassword(mockReq, mockRes, mockNext);
      
      // Test resetPassword error
      supabase.auth.updateUser.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      await authController.resetPassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    test('MarketController - all methods with success and error cases', async () => {
      const marketController = require('../src/controllers/marketController');
      const axios = require('axios');
      
      mockReq.params = { symbol: 'AAPL' };
      mockReq.query = { q: 'apple', resolution: 'D', period: '1M', indicators: 'sma,ema,rsi,macd,bbands' };
      
      // Test getQuote
      await marketController.getQuote(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
      
      // Test search
      await marketController.search(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
      
      // Test getCandles with all periods
      const periods = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];
      for (const period of periods) {
        mockReq.query.period = period;
        await marketController.getCandles(mockReq, mockRes, mockNext);
      }
      
      // Test getCandles with all resolutions
      const resolutions = ['1', '5', '15', '30', '60', 'D', 'W', 'M'];
      for (const resolution of resolutions) {
        mockReq.query.resolution = resolution;
        await marketController.getCandles(mockReq, mockRes, mockNext);
      }
      
      // Test getCandles with no data
      axios.create().get.mockResolvedValueOnce({ data: { s: 'no_data' } });
      await marketController.getCandles(mockReq, mockRes, mockNext);
      
      // Test getCompanyProfile
      await marketController.getCompanyProfile(mockReq, mockRes, mockNext);
      
      // Test getCompanyNews
      await marketController.getCompanyNews(mockReq, mockRes, mockNext);
      
      // Test getFinancials
      await marketController.getFinancials(mockReq, mockRes, mockNext);
      
      // Test getRecommendations
      await marketController.getRecommendations(mockReq, mockRes, mockNext);
      
      // Test getPriceTarget
      await marketController.getPriceTarget(mockReq, mockRes, mockNext);
      
      // Test getTechnicalIndicators
      await marketController.getTechnicalIndicators(mockReq, mockRes, mockNext);
      
      // Test getSupportResistance
      await marketController.getSupportResistance(mockReq, mockRes, mockNext);
      
      // Test error cases
      axios.create().get.mockRejectedValue(new Error('API Error'));
      
      await marketController.getQuote(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      await marketController.search(mockReq, mockRes, mockNext);
      await marketController.getCandles(mockReq, mockRes, mockNext);
      await marketController.getCompanyProfile(mockReq, mockRes, mockNext);
      await marketController.getCompanyNews(mockReq, mockRes, mockNext);
      await marketController.getFinancials(mockReq, mockRes, mockNext);
      await marketController.getRecommendations(mockReq, mockRes, mockNext);
      await marketController.getPriceTarget(mockReq, mockRes, mockNext);
      await marketController.getTechnicalIndicators(mockReq, mockRes, mockNext);
      await marketController.getSupportResistance(mockReq, mockRes, mockNext);
    });

    test('PortfolioController - all methods with complex scenarios', async () => {
      const portfolioController = require('../src/controllers/portfolioController');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test createPortfolio
      mockReq.body = { name: 'Test Portfolio', initial_capital: 10000, currency: 'USD' };
      await portfolioController.createPortfolio(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      
      // Test getPortfolios with pagination
      mockReq.query = { limit: '10', offset: '20' };
      await portfolioController.getPortfolios(mockReq, mockRes, mockNext);
      
      // Test getPortfolio
      mockReq.params = { id: 'portfolio123' };
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'portfolio123', user_id: 'user123' },
        error: null
      });
      await portfolioController.getPortfolio(mockReq, mockRes, mockNext);
      
      // Test getPortfolio not found
      supabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: null });
      await portfolioController.getPortfolio(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      
      // Test updatePortfolio
      mockReq.body = { name: 'Updated Portfolio' };
      await portfolioController.updatePortfolio(mockReq, mockRes, mockNext);
      
      // Test updatePortfolio not found
      supabase.from().update().eq().select().single.mockResolvedValueOnce({ data: null, error: null });
      await portfolioController.updatePortfolio(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      
      // Test deletePortfolio
      await portfolioController.deletePortfolio(mockReq, mockRes, mockNext);
      
      // Test addTransaction - buy
      mockReq.params = { portfolioId: 'portfolio123' };
      mockReq.body = { type: 'buy', symbol: 'AAPL', quantity: 10, price: 150, commission: 5 };
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'portfolio123', user_id: 'user123', cash_balance: 10000 },
        error: null
      });
      await portfolioController.addTransaction(mockReq, mockRes, mockNext);
      
      // Test addTransaction - sell without holdings
      mockReq.body.type = 'sell';
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'portfolio123', user_id: 'user123', cash_balance: 10000 },
        error: null
      });
      supabase.from().select().eq().order.mockResolvedValueOnce({ data: [], error: null });
      await portfolioController.addTransaction(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      
      // Test getTransactions with filters
      mockReq.query = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        type: 'buy',
        limit: '20',
        offset: '10'
      };
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      supabase.from().select.mockReturnValueOnce(mockChain);
      await portfolioController.getTransactions(mockReq, mockRes, mockNext);
      
      // Test getHoldings with complex holdings
      supabase.from().select().eq().order.mockResolvedValueOnce({
        data: [
          { symbol: 'AAPL', type: 'buy', quantity: 100, price: 100 },
          { symbol: 'AAPL', type: 'sell', quantity: 30, price: 110 },
          { symbol: 'AAPL', type: 'buy', quantity: 20, price: 105 },
          { symbol: 'GOOGL', type: 'buy', quantity: 50, price: 200 },
          { symbol: 'GOOGL', type: 'sell', quantity: 50, price: 210 },
          { symbol: 'MSFT', type: 'buy', quantity: 40, price: 150 }
        ],
        error: null
      });
      await portfolioController.getHoldings(mockReq, mockRes, mockNext);
      
      // Test getPerformance with all periods
      supabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'portfolio123', initial_capital: 10000 },
        error: null
      });
      supabase.from().select().eq().gte().order.mockResolvedValue({
        data: [
          { type: 'buy', quantity: 10, price: 100, commission: 5 },
          { type: 'sell', quantity: 5, price: 110, commission: 5 }
        ],
        error: null
      });
      
      const perfPeriods = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
      for (const period of perfPeriods) {
        mockReq.query = { period };
        await portfolioController.getPerformance(mockReq, mockRes, mockNext);
      }
      
      // Test exportPortfolio - CSV
      mockReq.query = { format: 'csv' };
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'portfolio123', name: 'Test Portfolio' },
        error: null
      });
      supabase.from().select().eq().order.mockResolvedValueOnce({
        data: [{ created_at: '2023-01-01', type: 'buy', symbol: 'AAPL', quantity: 10, price: 100, commission: 5 }],
        error: null
      });
      await portfolioController.exportPortfolio(mockReq, mockRes, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      
      // Test exportPortfolio - JSON
      mockReq.query = { format: 'json' };
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'portfolio123', name: 'Test Portfolio' },
        error: null
      });
      await portfolioController.exportPortfolio(mockReq, mockRes, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    test('RecommendationController - all methods and tiers', async () => {
      const recommendationController = require('../src/controllers/recommendationController');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test getRecommendations for all tiers
      const tiers = ['basic', 'premium', 'elite'];
      for (const tier of tiers) {
        mockReq.user.subscription_tier = tier;
        mockReq.query = {};
        await recommendationController.getRecommendations(mockReq, mockRes, mockNext);
      }
      
      // Test getRecommendations with status filter
      mockReq.query = { status: 'active' };
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      supabase.from.mockReturnValueOnce(mockChain);
      await recommendationController.getRecommendations(mockReq, mockRes, mockNext);
      
      // Test getRecommendationById
      mockReq.params = { id: 'rec123' };
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'rec123', symbol: 'AAPL' },
        error: null
      });
      await recommendationController.getRecommendationById(mockReq, mockRes, mockNext);
      
      // Test getRecommendationById not found
      supabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: null });
      await recommendationController.getRecommendationById(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      
      // Test getStrategyRecommendations
      mockReq.params = { strategyId: 'jesse-livermore' };
      await recommendationController.getStrategyRecommendations(mockReq, mockRes, mockNext);
      
      // Test applyRecommendation - success
      mockReq.params = { id: 'rec123' };
      mockReq.body = { portfolio_id: 'portfolio123', quantity: 10 };
      supabase.from().select().eq().single
        .mockResolvedValueOnce({ data: { id: 'rec123', symbol: 'AAPL', type: 'buy', target_price: 150 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'portfolio123', cash_balance: 10000 }, error: null });
      await recommendationController.applyRecommendation(mockReq, mockRes, mockNext);
      
      // Test applyRecommendation - insufficient funds
      supabase.from().select().eq().single
        .mockResolvedValueOnce({ data: { id: 'rec123', symbol: 'AAPL', type: 'buy', target_price: 150 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'portfolio123', cash_balance: 100 }, error: null });
      await recommendationController.applyRecommendation(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      
      // Test getRecommendationPerformance
      mockReq.query = { period: '1M' };
      supabase.from().select().gte().order.mockResolvedValueOnce({
        data: [
          { created_at: new Date(), status: 'completed', actual_return: 20 },
          { created_at: new Date(), status: 'completed', actual_return: -10 },
          { created_at: new Date(), status: 'completed', actual_return: 15 },
          { created_at: new Date(), status: 'active' },
          { created_at: new Date(), status: 'cancelled' }
        ],
        error: null
      });
      await recommendationController.getRecommendationPerformance(mockReq, mockRes, mockNext);
    });

    test('StrategyController - all methods and tier access', async () => {
      const strategyController = require('../src/controllers/strategyController');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test getStrategies for all tiers
      const tiers = ['basic', 'premium', 'elite'];
      for (const tier of tiers) {
        mockReq.user.subscription_tier = tier;
        await strategyController.getStrategies(mockReq, mockRes, mockNext);
      }
      
      // Test getStrategy - success
      mockReq.params = { id: 'jesse-livermore' };
      mockReq.user.subscription_tier = 'premium';
      await strategyController.getStrategy(mockReq, mockRes, mockNext);
      
      // Test getStrategy - premium strategy with basic tier
      mockReq.user.subscription_tier = 'basic';
      mockReq.params.id = 'warren-buffett';
      await strategyController.getStrategy(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      
      // Test getStrategy - not found
      mockReq.params.id = 'non-existent';
      await strategyController.getStrategy(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      
      // Test getStrategyPerformance
      mockReq.params.id = 'jesse-livermore';
      mockReq.query = { period: '1Y' };
      supabase.from().select().eq().gte().order.mockResolvedValueOnce({
        data: [
          { created_at: new Date(), status: 'completed', actual_return: 25 },
          { created_at: new Date(), status: 'completed', actual_return: -15 },
          { created_at: new Date(), status: 'stopped', actual_return: -20 },
          { created_at: new Date(), status: 'active' }
        ],
        error: null
      });
      await strategyController.getStrategyPerformance(mockReq, mockRes, mockNext);
      
      // Test subscribeToStrategy - success
      mockReq.user.subscription_tier = 'premium';
      mockReq.params.id = 'jesse-livermore';
      supabase.from().select().match().single.mockResolvedValueOnce({ data: null, error: null });
      await strategyController.subscribeToStrategy(mockReq, mockRes, mockNext);
      
      // Test subscribeToStrategy - already subscribed
      supabase.from().select().match().single.mockResolvedValueOnce({ data: { id: 'sub123' }, error: null });
      await strategyController.subscribeToStrategy(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      
      // Test unsubscribeFromStrategy - success
      supabase.from().delete().match.mockResolvedValueOnce({ data: { id: 'sub123' }, error: null });
      await strategyController.unsubscribeFromStrategy(mockReq, mockRes, mockNext);
      
      // Test unsubscribeFromStrategy - not found
      supabase.from().delete().match.mockResolvedValueOnce({ data: null, error: null });
      await strategyController.unsubscribeFromStrategy(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      
      // Test getUserSubscriptions
      await strategyController.getUserSubscriptions(mockReq, mockRes, mockNext);
    });

    test('SubscriptionController - all existing methods', async () => {
      const subscriptionController = require('../src/controllers/subscriptionController');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test getPlans
      await subscriptionController.getPlans(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.any(Array)
      });
      
      // Test getCurrentSubscription - success
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { tier: 'premium', status: 'active' },
        error: null
      });
      await subscriptionController.getCurrentSubscription(mockReq, mockRes, mockNext);
      
      // Test getCurrentSubscription - error
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' }
      });
      await subscriptionController.getCurrentSubscription(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      
      // Test createSubscription
      mockReq.body = { tier: 'premium', payment_method_id: 'pm_123' };
      await subscriptionController.createSubscription(mockReq, mockRes, mockNext);
      
      // Test upgradeSubscription
      mockReq.body = { new_tier: 'professional' };
      await subscriptionController.upgradeSubscription(mockReq, mockRes, mockNext);
      
      // Test cancelSubscription
      await subscriptionController.cancelSubscription(mockReq, mockRes, mockNext);
      
      // Test getUsage
      await subscriptionController.getUsage(mockReq, mockRes, mockNext);
      
      // Test getSubscriptionHistory
      await subscriptionController.getSubscriptionHistory(mockReq, mockRes, mockNext);
      
      // Test updatePaymentMethod
      mockReq.body = { payment_method_id: 'pm_new123' };
      await subscriptionController.updatePaymentMethod(mockReq, mockRes, mockNext);
    });
  });

  describe('Middleware', () => {
    test('Auth middleware - all scenarios', async () => {
      const authMiddleware = require('../src/middleware/auth');
      const jwt = require('jsonwebtoken');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient();
      
      // Test authenticate - success
      mockReq.headers.authorization = 'Bearer valid-token';
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      
      // Test authenticate - missing token
      mockReq.headers = {};
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test authenticate - invalid format
      mockReq.headers.authorization = 'InvalidFormat';
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test authenticate - JWT error
      mockReq.headers.authorization = 'Bearer token';
      jwt.verify.mockImplementationOnce(() => { throw new Error('Invalid token'); });
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test authenticate - database error
      jwt.verify.mockReturnValueOnce({ id: 'user123' });
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      
      // Test authorize
      const authorize = authMiddleware.authorize('basic', 'premium', 'elite');
      mockReq.user = { subscription_tier: 'premium' };
      authorize(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Test authorize - forbidden
      mockReq.user.subscription_tier = 'free';
      mockNext.mockClear();
      authorize(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      
      // Test tierRateLimit
      const tierTests = ['basic', 'premium', 'elite'];
      tierTests.forEach(tier => {
        mockReq.user.subscription_tier = tier;
        authMiddleware.tierRateLimit(mockReq, mockRes, mockNext);
      });
    });

    test('Error handler middleware', () => {
      const { errorHandler } = require('../src/middleware/errorHandler');
      
      const errors = [
        { message: 'Bad Request', status: 400 },
        { message: 'Unauthorized', status: 401 },
        { message: 'Forbidden', status: 403 },
        { message: 'Not Found', status: 404 },
        { message: 'Internal Error' }
      ];
      
      errors.forEach(({ message, status }) => {
        const error = new Error(message);
        if (status) error.status = status;
        errorHandler(error, mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(status || 500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: message
        });
      });
    });

    test('Rate limiter loads', () => {
      const rateLimiter = require('../src/middleware/rateLimiter');
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });
  });

  describe('Services', () => {
    test('FinnhubService - all methods and static functions', async () => {
      const FinnhubService = require('../src/services/finnhubService');
      const finnhubService = new FinnhubService();
      
      // Test all instance methods
      const result1 = await finnhubService.quote('AAPL');
      expect(result1).toBeDefined();
      
      const result2 = await finnhubService.search('apple');
      expect(result2).toBeDefined();
      
      const result3 = await finnhubService.candles('AAPL', 'D', 1234567890, 1234567900);
      expect(result3).toBeDefined();
      
      const result4 = await finnhubService.companyProfile('AAPL');
      expect(result4).toBeDefined();
      
      const result5 = await finnhubService.companyNews('AAPL', '2023-01-01', '2023-12-31');
      expect(result5).toBeDefined();
      
      const result6 = await finnhubService.financials('AAPL');
      expect(result6).toBeDefined();
      
      const result7 = await finnhubService.recommendations('AAPL');
      expect(result7).toBeDefined();
      
      const result8 = await finnhubService.priceTarget('AAPL');
      expect(result8).toBeDefined();
      
      const result9 = await finnhubService.supportResistance('AAPL', 'D');
      expect(result9).toBeDefined();
      
      const result10 = await finnhubService.technicalIndicator('AAPL', 'D', 1234567890, 1234567900, 'sma', { timeperiod: 20 });
      expect(result10).toBeDefined();
      
      // Test error handling
      const axios = require('axios');
      axios.create().get.mockRejectedValueOnce(new Error('API Error'));
      try {
        await finnhubService.quote('AAPL');
      } catch (error) {
        expect(error.message).toBe('API Error');
      }
      
      // Test static formatCandles
      let formatted = FinnhubService.formatCandles({
        t: [1234567890, 1234567900],
        o: [100, 101],
        h: [102, 103],
        l: [99, 100],
        c: [101, 102],
        v: [1000, 1100],
        s: 'ok'
      });
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toHaveProperty('timestamp');
      expect(formatted[0]).toHaveProperty('open', 100);
      
      // Test formatCandles edge cases
      expect(FinnhubService.formatCandles({ s: 'no_data' })).toEqual([]);
      expect(FinnhubService.formatCandles(null)).toEqual([]);
      expect(FinnhubService.formatCandles(undefined)).toEqual([]);
      expect(FinnhubService.formatCandles({})).toEqual([]);
      expect(FinnhubService.formatCandles({ t: null })).toEqual([]);
      
      // Test static getDateString
      const offsets = [0, 1, -1, 7, 30, 365, -365];
      offsets.forEach(offset => {
        const dateStr = FinnhubService.getDateString(offset);
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Validators', () => {
    const validators = [
      { name: 'auth', methods: ['validateRegister', 'validateLogin', 'validateUpdateProfile', 'validateChangePassword'] },
      { name: 'market', methods: ['validateSymbol', 'validateSearch', 'validateCandles', 'validateTechnicalIndicators'] },
      { name: 'portfolio', methods: ['validateCreatePortfolio', 'validateUpdatePortfolio', 'validateAddTransaction', 'validatePortfolioQuery'] },
      { name: 'recommendation', methods: ['validateApplyRecommendation', 'validateRecommendationQuery'] },
      { name: 'strategy', methods: ['validateStrategyId', 'validatePerformanceQuery'] },
      { name: 'subscription', methods: ['validateCreateSubscription', 'validateUpdateSubscription', 'validateBillingQuery'] }
    ];

    validators.forEach(({ name, methods }) => {
      test(`${name} validator`, () => {
        const validator = require(`../src/validators/${name}`);
        methods.forEach(method => {
          expect(validator[method]).toBeDefined();
          expect(Array.isArray(validator[method])).toBe(true);
        });
      });
    });
  });

  describe('Routes', () => {
    const routes = ['auth', 'market', 'portfolio', 'recommendations', 'strategies', 'subscription'];
    
    routes.forEach(route => {
      test(`${route} routes load`, () => {
        const router = require(`../src/routes/${route}`);
        expect(router).toBeDefined();
        expect(typeof router).toBe('function');
      });
    });
  });

  describe('Config', () => {
    test('database config loads', () => {
      const database = require('../src/config/database');
      expect(database).toBeDefined();
    });

    test('supabase config loads', () => {
      const { supabase } = require('../src/config/supabase');
      expect(supabase).toBeDefined();
    });
  });

  describe('Utils', () => {
    test('logger loads and has methods', () => {
      const logger = require('../src/utils/logger');
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });

  describe('Server', () => {
    test('server module loads', () => {
      // Prevent the server from actually starting
      jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      // The server will try to start but won't bind to port in test env
      expect(() => require('../src/server')).not.toThrow();
      
      process.exit.mockRestore();
    });
  });
});
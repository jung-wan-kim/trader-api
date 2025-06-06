// Complete test suite for 99% coverage
// Set up environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-secret';
process.env.FINNHUB_API_KEY = 'test-finnhub-key';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.CACHE_TTL = '300';

// Mock modules
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      json: jest.fn(),
      printf: jest.fn(),
      simple: jest.fn(),
      colorize: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Create chainable mock methods
const createChainableMock = () => {
  const chainable = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue({ count: 0, error: null }),
    textSearch: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis()
  };
  
  // Make each method return the chainable object
  Object.keys(chainable).forEach(key => {
    if (key !== 'single' && key !== 'count') {
      chainable[key].mockReturnValue(chainable);
    }
  });
  
  // Add resolved values
  chainable.mockResolvedValue = (value) => {
    chainable.single.mockResolvedValue(value);
    chainable.count.mockResolvedValue(value);
    return chainable;
  };
  
  return chainable;
};

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => createChainableMock()),
  auth: {
    signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' }, session: {} }, error: null }),
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
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
    admin: {
      deleteUser: jest.fn().mockResolvedValue({ error: null })
    }
  }
};

const mockSupabaseAdmin = {
  from: jest.fn(() => createChainableMock()),
  auth: {
    admin: {
      deleteUser: jest.fn().mockResolvedValue({ error: null })
    }
  }
};

jest.mock('../src/config/supabase.js', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseAdmin
}));

// Mock axios
const mockAxiosInstance = {
  get: jest.fn().mockImplementation((endpoint) => {
    const responses = {
      '/quote': { data: { c: 150, d: 2, dp: 1.35, h: 155, l: 148, o: 149, pc: 148, t: Date.now() } },
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
      '/stock/profile2': { data: { name: 'Apple Inc', ticker: 'AAPL', market: 'stocks' } },
      '/company-news': { data: [{ headline: 'News', datetime: Date.now() }] },
      '/stock/metric': { data: { metric: { '52WeekHigh': 180 } } },
      '/stock/recommendation': { data: [{ period: '2023-01', strongBuy: 10 }] },
      '/stock/price-target': { data: { targetHigh: 200, targetLow: 150 } },
      '/scan/support-resistance': { data: { levels: [150, 160] } },
      '/indicator': { data: { sma: [50, 51] } }
    };
    return Promise.resolve(responses[endpoint] || { data: {} });
  })
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}));

// Mock other dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ id: 'user123', email: 'test@test.com' }))
}));

const mockCache = {
  get: jest.fn(() => null),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  keys: jest.fn(() => []),
  getStats: jest.fn(() => ({ hits: 0, misses: 0 }))
};

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => mockCache);
});

jest.mock('express-rate-limit', () => 
  jest.fn((options) => (req, res, next) => {
    // Simulate rate limiting
    const key = req.ip || 'test-ip';
    if (!req.rateLimitTest) {
      req.rateLimitTest = {};
    }
    if (!req.rateLimitTest[key]) {
      req.rateLimitTest[key] = 0;
    }
    req.rateLimitTest[key]++;
    
    if (req.rateLimitTest[key] > (options.max || 100)) {
      res.status(429).json({ error: 'Too many requests' });
    } else {
      next();
    }
  })
);

// Mock express-validator
const mockValidationChain = {
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
  escape: jest.fn().mockReturnThis(),
  isFloat: jest.fn().mockReturnThis(),
  toFloat: jest.fn().mockReturnThis(),
  isBoolean: jest.fn().mockReturnThis(),
  isObject: jest.fn().mockReturnThis(),
  isArray: jest.fn().mockReturnThis()
};

let mockValidationResult = {
  isEmpty: jest.fn(() => true),
  array: jest.fn(() => [])
};

jest.mock('express-validator', () => ({
  body: jest.fn(() => mockValidationChain),
  param: jest.fn(() => mockValidationChain),
  query: jest.fn(() => mockValidationChain),
  validationResult: jest.fn(() => mockValidationResult)
}));

// Test data
const testUser = {
  id: 'user123',
  email: 'test@test.com',
  name: 'Test User',
  subscription_tier: 'premium',
  investment_style: 'moderate'
};

describe('Full Coverage Test Suite', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: testUser,
      ip: 'test-ip'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
      end: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // Reset validation result
    mockValidationResult = {
      isEmpty: jest.fn(() => true),
      array: jest.fn(() => [])
    };
  });

  describe('Controllers', () => {
    describe('AuthController - Complete Coverage', () => {
      let authController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          authController = require('../src/controllers/authController');
        });
      });

      describe('register', () => {
        test('successful registration', async () => {
          mockReq.body = {
            email: 'newuser@test.com',
            password: 'password123',
            name: 'New User',
            investmentStyle: 'aggressive'
          };
          
          await authController.register(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
          expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
          expect(mockRes.status).toHaveBeenCalledWith(201);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Registration successful'
          }));
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Invalid email' }]);
          
          await authController.register(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({
            errors: [{ msg: 'Invalid email' }]
          });
        });

        test('auth signup error', async () => {
          mockReq.body = { email: 'test@test.com', password: 'pass' };
          mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
            data: null,
            error: { message: 'Email already exists' }
          });
          
          await authController.register(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Registration failed'
          }));
        });

        test('profile creation error', async () => {
          mockReq.body = { email: 'test@test.com', password: 'pass' };
          mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: 'user123' } },
            error: null
          });
          
          const mockFrom = createChainableMock();
          mockFrom.insert().select().single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Database error' }
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.register(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user123');
          expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        test('unexpected error', async () => {
          mockReq.body = { email: 'test@test.com', password: 'pass' };
          mockSupabaseClient.auth.signUp.mockRejectedValueOnce(new Error('Network error'));
          
          await authController.register(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('login', () => {
        test('successful login', async () => {
          mockReq.body = { email: 'test@test.com', password: 'password123' };
          const mockFrom = createChainableMock();
          mockFrom.select().eq().single.mockResolvedValueOnce({
            data: testUser,
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.login(mockReq, mockRes, mockNext);
          
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
              user: expect.any(Object),
              token: expect.any(String)
            })
          }));
        });

        test('invalid credentials', async () => {
          mockReq.body = { email: 'test@test.com', password: 'wrong' };
          mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
            data: null,
            error: { message: 'Invalid login credentials' }
          });
          
          await authController.login(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Email required' }]);
          
          await authController.login(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('profile not found', async () => {
          mockReq.body = { email: 'test@test.com', password: 'password123' };
          mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: { id: 'user123' }, session: {} },
            error: null
          });
          
          const mockFrom = createChainableMock();
          mockFrom.select().eq().single.mockResolvedValueOnce({
            data: null,
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.login(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(500);
        });
      });

      describe('logout', () => {
        test('successful logout', async () => {
          mockReq.headers.authorization = 'Bearer token';
          
          await authController.logout(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Logged out successfully'
          });
        });

        test('logout without token', async () => {
          await authController.logout(mockReq, mockRes, mockNext);
          
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Logged out successfully'
          });
        });

        test('logout error', async () => {
          mockReq.headers.authorization = 'Bearer token';
          mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
            error: { message: 'Logout failed' }
          });
          
          await authController.logout(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('getProfile', () => {
        test('successful get profile', async () => {
          const mockFrom = createChainableMock();
          mockFrom.select().eq().single.mockResolvedValueOnce({
            data: testUser,
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.getProfile(mockReq, mockRes, mockNext);
          
          expect(mockRes.json).toHaveBeenCalledWith({
            data: testUser
          });
        });

        test('profile not found', async () => {
          const mockFrom = createChainableMock();
          mockFrom.select().eq().single.mockResolvedValueOnce({
            data: null,
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.getProfile(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        test('database error', async () => {
          const mockFrom = createChainableMock();
          mockFrom.select().eq().single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Database error' }
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.getProfile(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('updateProfile', () => {
        test('successful update', async () => {
          mockReq.body = { name: 'Updated Name' };
          const mockFrom = createChainableMock();
          mockFrom.update().eq().mockResolvedValueOnce({
            data: { ...testUser, name: 'Updated Name' },
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.updateProfile(mockReq, mockRes, mockNext);
          
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Profile updated successfully',
            data: expect.any(Object)
          });
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Invalid data' }]);
          
          await authController.updateProfile(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('update error', async () => {
          mockReq.body = { name: 'Updated' };
          const mockFrom = createChainableMock();
          mockFrom.update().eq().mockResolvedValueOnce({
            data: null,
            error: { message: 'Update failed' }
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.updateProfile(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('changePassword', () => {
        test('successful password change', async () => {
          mockReq.body = { currentPassword: 'old', newPassword: 'new123' };
          
          await authController.changePassword(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
            password: 'new123'
          });
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Password changed successfully'
          });
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Password too short' }]);
          
          await authController.changePassword(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('update error', async () => {
          mockReq.body = { currentPassword: 'old', newPassword: 'new' };
          mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({
            data: null,
            error: { message: 'Update failed' }
          });
          
          await authController.changePassword(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('deleteAccount', () => {
        test('successful account deletion', async () => {
          mockReq.body = { password: 'password123' };
          const mockFrom = createChainableMock();
          mockFrom.delete().eq.mockResolvedValueOnce({
            data: null,
            error: null
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.deleteAccount(mockReq, mockRes, mockNext);
          
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Account deleted successfully'
          });
        });

        test('deletion error', async () => {
          mockReq.body = { password: 'password123' };
          const mockFrom = createChainableMock();
          mockFrom.delete().eq.mockResolvedValueOnce({
            data: null,
            error: { message: 'Deletion failed' }
          });
          mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
          
          await authController.deleteAccount(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('refreshToken', () => {
        test('successful token refresh', async () => {
          mockReq.body = { refreshToken: 'refresh-token' };
          
          await authController.refreshToken(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
          expect(mockRes.json).toHaveBeenCalledWith({
            data: expect.objectContaining({
              session: expect.any(Object)
            })
          });
        });

        test('missing refresh token', async () => {
          await authController.refreshToken(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('refresh error', async () => {
          mockReq.body = { refreshToken: 'invalid' };
          mockSupabaseClient.auth.refreshSession.mockResolvedValueOnce({
            data: null,
            error: { message: 'Invalid token' }
          });
          
          await authController.refreshToken(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(401);
        });
      });

      describe('forgotPassword', () => {
        test('successful password reset email', async () => {
          mockReq.body = { email: 'test@test.com' };
          
          await authController.forgotPassword(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Password reset email sent'
          });
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Invalid email' }]);
          
          await authController.forgotPassword(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });
      });

      describe('resetPassword', () => {
        test('successful password reset', async () => {
          mockReq.body = { token: 'reset-token', newPassword: 'newpass123' };
          
          await authController.resetPassword(mockReq, mockRes, mockNext);
          
          expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
            password: 'newpass123'
          });
          expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Password reset successfully'
          });
        });

        test('validation errors', async () => {
          mockValidationResult.isEmpty.mockReturnValue(false);
          mockValidationResult.array.mockReturnValue([{ msg: 'Password too short' }]);
          
          await authController.resetPassword(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(400);
        });
      });
    });

    describe('MarketController - Complete Coverage', () => {
      let marketController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          marketController = require('../src/controllers/marketController');
        });
      });

      test('getQuote success', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getQuote(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            symbol: 'AAPL',
            current: 150
          })
        });
      });

      test('getQuote error', async () => {
        mockReq.params = { symbol: 'AAPL' };
        mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));
        
        await marketController.getQuote(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      test('getCandles with various parameters', async () => {
        mockReq.params = { symbol: 'AAPL' };
        mockReq.query = { resolution: 'D' };
        
        await marketController.getCandles(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });

      test('getCandles with no data', async () => {
        mockReq.params = { symbol: 'AAPL' };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: { s: 'no_data' } });
        
        await marketController.getCandles(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: []
        });
      });

      test('getCompanyProfile', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getCompanyProfile(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Apple Inc',
            ticker: 'AAPL'
          })
        });
      });

      test('getCompanyNews', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getCompanyNews(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });

      test('getBasicFinancials', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getBasicFinancials(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });

      test('getRecommendationTrends', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getRecommendationTrends(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });

      test('getPriceTarget', async () => {
        mockReq.params = { symbol: 'AAPL' };
        
        await marketController.getPriceTarget(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            targetHigh: 200,
            targetLow: 150
          })
        });
      });

      test('getSupportResistance', async () => {
        mockReq.params = { symbol: 'AAPL' };
        mockReq.query = { resolution: 'D' };
        
        await marketController.getSupportResistance(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });

      test('getTechnicalIndicators', async () => {
        mockReq.params = { symbol: 'AAPL' };
        mockReq.query = { indicator: 'sma', resolution: 'D' };
        
        await marketController.getTechnicalIndicators(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });
    });

    describe('PortfolioController - Complete Coverage', () => {
      let portfolioController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          portfolioController = require('../src/controllers/portfolioController');
        });
      });

      test('createPortfolio success', async () => {
        mockReq.body = { name: 'Test Portfolio', initial_balance: 10000 };
        const mockFrom = createChainableMock();
        mockFrom.insert().select().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', name: 'Test Portfolio' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.createPortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      test('createPortfolio validation error', async () => {
        mockValidationResult.isEmpty.mockReturnValue(false);
        mockValidationResult.array.mockReturnValue([{ msg: 'Name required' }]);
        
        await portfolioController.createPortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      test('getPortfolios', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().eq().order.mockResolvedValueOnce({
          data: [{ id: 'p1' }, { id: 'p2' }],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getPortfolios(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });

      test('getPortfolio success', async () => {
        mockReq.params = { id: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getPortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });

      test('getPortfolio not found', async () => {
        mockReq.params = { id: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: null,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getPortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      test('getPortfolio forbidden', async () => {
        mockReq.params = { id: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'other-user' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getPortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('updatePortfolio', async () => {
        mockReq.params = { id: 'portfolio123' };
        mockReq.body = { name: 'Updated Portfolio' };
        const mockFrom = createChainableMock();
        mockFrom.update().eq().mockResolvedValueOnce({
          data: { id: 'portfolio123', name: 'Updated Portfolio' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.updatePortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Portfolio updated successfully',
          data: expect.any(Object)
        });
      });

      test('deletePortfolio', async () => {
        mockReq.params = { id: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.delete().eq.mockResolvedValueOnce({
          data: null,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.deletePortfolio(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(204);
        expect(mockRes.end).toHaveBeenCalled();
      });

      test('addTransaction - buy', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        mockReq.body = {
          type: 'BUY',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          commission: 5
        };
        
        const portfolioMock = createChainableMock();
        portfolioMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123', balance: 10000 },
          error: null
        });
        
        const transactionMock = createChainableMock();
        transactionMock.insert().mockResolvedValueOnce({
          data: { id: 'trans123' },
          error: null
        });
        
        const updateMock = createChainableMock();
        updateMock.update().eq.mockResolvedValueOnce({
          data: null,
          error: null
        });
        
        mockSupabaseAdmin.from
          .mockReturnValueOnce(portfolioMock)
          .mockReturnValueOnce(transactionMock)
          .mockReturnValueOnce(updateMock);
        
        await portfolioController.addTransaction(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      test('addTransaction - insufficient balance', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        mockReq.body = {
          type: 'BUY',
          symbol: 'AAPL',
          quantity: 100,
          price: 150
        };
        
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123', balance: 100 },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.addTransaction(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      test('getTransactions', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().order.mockResolvedValueOnce({
          data: [],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getTransactions(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: []
        });
      });

      test('getHoldings', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq.mockResolvedValueOnce({
          data: [
            { symbol: 'AAPL', type: 'BUY', quantity: 100, price: 100 },
            { symbol: 'AAPL', type: 'SELL', quantity: 50, price: 110 }
          ],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await portfolioController.getHoldings(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });

      test('getPerformance', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        
        const portfolioMock = createChainableMock();
        portfolioMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', initial_balance: 10000, balance: 12000 },
          error: null
        });
        
        const transactionsMock = createChainableMock();
        transactionsMock.select().eq().order.mockResolvedValueOnce({
          data: [],
          error: null
        });
        
        mockSupabaseAdmin.from
          .mockReturnValueOnce(portfolioMock)
          .mockReturnValueOnce(transactionsMock);
        
        await portfolioController.getPerformance(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            totalReturn: expect.any(Number),
            percentageReturn: expect.any(Number)
          })
        });
      });

      test('exportData - CSV', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        mockReq.query = { format: 'csv' };
        
        const portfolioMock = createChainableMock();
        portfolioMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123', name: 'Test' },
          error: null
        });
        
        const transactionsMock = createChainableMock();
        transactionsMock.select().eq().order.mockResolvedValueOnce({
          data: [
            {
              created_at: '2023-01-01T00:00:00Z',
              type: 'BUY',
              symbol: 'AAPL',
              quantity: 10,
              price: 150,
              commission: 5
            }
          ],
          error: null
        });
        
        mockSupabaseAdmin.from
          .mockReturnValueOnce(portfolioMock)
          .mockReturnValueOnce(transactionsMock);
        
        await portfolioController.exportData(mockReq, mockRes, mockNext);
        
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(mockRes.send).toHaveBeenCalled();
      });

      test('exportData - JSON', async () => {
        mockReq.params = { portfolioId: 'portfolio123' };
        mockReq.query = { format: 'json' };
        
        const portfolioMock = createChainableMock();
        portfolioMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123' },
          error: null
        });
        
        const transactionsMock = createChainableMock();
        transactionsMock.select().eq().order.mockResolvedValueOnce({
          data: [],
          error: null
        });
        
        mockSupabaseAdmin.from
          .mockReturnValueOnce(portfolioMock)
          .mockReturnValueOnce(transactionsMock);
        
        await portfolioController.exportData(mockReq, mockRes, mockNext);
        
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      });
    });

    describe('RecommendationController - Complete Coverage', () => {
      let recommendationController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          recommendationController = require('../src/controllers/recommendationController');
        });
      });

      test('getRecommendations - basic tier', async () => {
        mockReq.user.subscription_tier = 'basic';
        const mockFrom = createChainableMock();
        mockFrom.select().order().limit.mockResolvedValueOnce({
          data: [],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await recommendationController.getRecommendations(mockReq, mockRes, mockNext);
        
        expect(mockFrom.limit).toHaveBeenCalledWith(5);
        expect(mockRes.json).toHaveBeenCalled();
      });

      test('getRecommendations - premium tier', async () => {
        mockReq.user.subscription_tier = 'premium';
        const mockFrom = createChainableMock();
        mockFrom.select().order().limit.mockResolvedValueOnce({
          data: [],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await recommendationController.getRecommendations(mockReq, mockRes, mockNext);
        
        expect(mockFrom.limit).toHaveBeenCalledWith(20);
      });

      test('getRecommendations - professional tier', async () => {
        mockReq.user.subscription_tier = 'professional';
        const mockFrom = createChainableMock();
        mockFrom.select().order().limit.mockResolvedValueOnce({
          data: [],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await recommendationController.getRecommendations(mockReq, mockRes, mockNext);
        
        expect(mockFrom.limit).toHaveBeenCalledWith(50);
      });

      test('getRecommendationById', async () => {
        mockReq.params = { id: 'rec123' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: { id: 'rec123', symbol: 'AAPL' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await recommendationController.getRecommendationById(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });

      test('applyRecommendation - buy', async () => {
        mockReq.params = { id: 'rec123' };
        mockReq.body = { portfolio_id: 'portfolio123', quantity: 10 };
        
        const recMock = createChainableMock();
        recMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'rec123', symbol: 'AAPL', type: 'BUY', target_price: 150 },
          error: null
        });
        
        const portfolioMock = createChainableMock();
        portfolioMock.select().eq().single.mockResolvedValueOnce({
          data: { id: 'portfolio123', user_id: 'user123', balance: 10000 },
          error: null
        });
        
        const transMock = createChainableMock();
        transMock.insert.mockResolvedValueOnce({
          data: { id: 'trans123' },
          error: null
        });
        
        const updatePortMock = createChainableMock();
        updatePortMock.update().eq.mockResolvedValueOnce({
          data: null,
          error: null
        });
        
        const updateRecMock = createChainableMock();
        updateRecMock.update().eq.mockResolvedValueOnce({
          data: null,
          error: null
        });
        
        mockSupabaseAdmin.from
          .mockReturnValueOnce(recMock)
          .mockReturnValueOnce(portfolioMock)
          .mockReturnValueOnce(transMock)
          .mockReturnValueOnce(updatePortMock)
          .mockReturnValueOnce(updateRecMock);
        
        await recommendationController.applyRecommendation(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Recommendation applied successfully',
          data: expect.any(Object)
        });
      });

      test('getRecommendationPerformance', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().gte.mockResolvedValueOnce({
          data: [
            { status: 'COMPLETED', actual_return: 10 },
            { status: 'COMPLETED', actual_return: -5 },
            { status: 'ACTIVE' }
          ],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await recommendationController.getRecommendationPerformance(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            totalRecommendations: 3,
            completedRecommendations: 2,
            successRate: 50,
            averageReturn: 2.5
          })
        });
      });

      test('getStrategies', async () => {
        await recommendationController.getStrategies(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });
    });

    describe('StrategyController - Complete Coverage', () => {
      let strategyController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          strategyController = require('../src/controllers/strategyController');
        });
      });

      test('getStrategies - basic tier', async () => {
        mockReq.user.subscription_tier = 'basic';
        
        await strategyController.getStrategies(mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.data).toHaveLength(3); // Basic strategies only
      });

      test('getStrategies - premium tier', async () => {
        mockReq.user.subscription_tier = 'premium';
        
        await strategyController.getStrategies(mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.length).toBeGreaterThan(3);
      });

      test('getStrategies - professional tier', async () => {
        mockReq.user.subscription_tier = 'professional';
        
        await strategyController.getStrategies(mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.length).toBeGreaterThan(6);
      });

      test('getStrategy - allowed access', async () => {
        mockReq.params = { id: 'momentum' };
        mockReq.user.subscription_tier = 'basic';
        
        await strategyController.getStrategy(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            id: 'momentum'
          })
        });
      });

      test('getStrategy - forbidden access', async () => {
        mockReq.params = { id: 'value-investing' };
        mockReq.user.subscription_tier = 'basic';
        
        await strategyController.getStrategy(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('getStrategy - not found', async () => {
        mockReq.params = { id: 'non-existent' };
        
        await strategyController.getStrategy(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      test('getStrategyPerformance', async () => {
        mockReq.params = { id: 'momentum' };
        const mockFrom = createChainableMock();
        mockFrom.select().eq().gte.mockResolvedValueOnce({
          data: [
            { status: 'COMPLETED', actual_return: 15 },
            { status: 'COMPLETED', actual_return: -10 }
          ],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await strategyController.getStrategyPerformance(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            strategy_id: 'momentum',
            totalRecommendations: 2
          })
        });
      });

      test('subscribeToStrategy', async () => {
        mockReq.params = { id: 'momentum' };
        const mockFrom = createChainableMock();
        mockFrom.insert.mockResolvedValueOnce({
          data: { id: 'sub123' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await strategyController.subscribeToStrategy(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      test('unsubscribeFromStrategy', async () => {
        mockReq.params = { id: 'momentum' };
        const mockFrom = createChainableMock();
        mockFrom.delete().match.mockResolvedValueOnce({
          data: null,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await strategyController.unsubscribeFromStrategy(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Unsubscribed from strategy successfully'
        });
      });

      test('getUserStrategies', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().eq.mockResolvedValueOnce({
          data: [{ strategy_id: 'momentum' }],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await strategyController.getUserStrategies(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Array)
        });
      });
    });

    describe('SubscriptionController - Complete Coverage', () => {
      let subscriptionController;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          subscriptionController = require('../src/controllers/subscriptionController');
        });
      });

      test('getPlans', async () => {
        await subscriptionController.getPlans(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'basic' }),
            expect.objectContaining({ id: 'premium' }),
            expect.objectContaining({ id: 'professional' })
          ])
        });
      });

      test('getCurrentSubscription', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: { tier: 'premium', status: 'active' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.getCurrentSubscription(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.any(Object)
        });
      });

      test('createSubscription', async () => {
        mockReq.body = { tier: 'premium', payment_method_id: 'pm_123' };
        const mockFrom = createChainableMock();
        mockFrom.insert.mockResolvedValueOnce({
          data: { id: 'sub123' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.createSubscription(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      test('updateSubscription', async () => {
        mockReq.body = { tier: 'professional' };
        const mockFrom = createChainableMock();
        mockFrom.update().eq.mockResolvedValueOnce({
          data: { tier: 'professional' },
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.updateSubscription(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Subscription updated successfully',
          data: expect.any(Object)
        });
      });

      test('cancelSubscription', async () => {
        const mockFrom = createChainableMock();
        mockFrom.update().eq.mockResolvedValueOnce({
          data: null,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.cancelSubscription(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Subscription cancelled successfully'
        });
      });

      test('getUsageStats', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().eq().gte.mockResolvedValueOnce({
          data: [
            { endpoint: '/api/market/quote', count: 10 },
            { endpoint: '/api/recommendations', count: 5 }
          ],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.getUsageStats(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: expect.objectContaining({
            total_requests: 15
          })
        });
      });

      test('getInvoices', async () => {
        const mockFrom = createChainableMock();
        mockFrom.select().eq().order.mockResolvedValueOnce({
          data: [],
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await subscriptionController.getInvoices(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          data: []
        });
      });

      test('updatePaymentMethod', async () => {
        mockReq.body = { payment_method_id: 'pm_new123' };
        
        await subscriptionController.updatePaymentMethod(mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Payment method updated successfully'
        });
      });
    });
  });

  describe('Middleware', () => {
    describe('Auth Middleware - Complete Coverage', () => {
      let authMiddleware;
      const jwt = require('jsonwebtoken');
      
      beforeEach(() => {
        jest.isolateModules(() => {
          authMiddleware = require('../src/middleware/auth');
        });
      });

      test('authenticate - successful', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        jwt.verify.mockReturnValueOnce({ id: 'user123' });
        
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: testUser,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await authMiddleware.authenticate(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toEqual(testUser);
      });

      test('authenticate - no token', async () => {
        mockReq.headers = {};
        
        await authMiddleware.authenticate(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'No token provided'
        });
      });

      test('authenticate - invalid token format', async () => {
        mockReq.headers.authorization = 'InvalidFormat';
        
        await authMiddleware.authenticate(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      test('authenticate - JWT error', async () => {
        mockReq.headers.authorization = 'Bearer invalid-token';
        jwt.verify.mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });
        
        await authMiddleware.authenticate(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      test('authenticate - user not found', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        jwt.verify.mockReturnValueOnce({ id: 'user123' });
        
        const mockFrom = createChainableMock();
        mockFrom.select().eq().single.mockResolvedValueOnce({
          data: null,
          error: null
        });
        mockSupabaseAdmin.from.mockReturnValueOnce(mockFrom);
        
        await authMiddleware.authenticate(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      test('authorize - allowed', () => {
        const authorize = authMiddleware.authorize('basic', 'premium');
        mockReq.user = { subscription_tier: 'premium' };
        
        authorize(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      });

      test('authorize - forbidden', () => {
        const authorize = authMiddleware.authorize('premium', 'professional');
        mockReq.user = { subscription_tier: 'basic' };
        
        authorize(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('tierRateLimit - all tiers', () => {
        const expressRateLimit = require('express-rate-limit');
        
        // Basic tier
        mockReq.user = { subscription_tier: 'basic' };
        authMiddleware.tierRateLimit(mockReq, mockRes, mockNext);
        expect(expressRateLimit).toHaveBeenCalledWith(expect.objectContaining({
          max: 10
        }));
        
        // Premium tier
        mockReq.user = { subscription_tier: 'premium' };
        authMiddleware.tierRateLimit(mockReq, mockRes, mockNext);
        expect(expressRateLimit).toHaveBeenCalledWith(expect.objectContaining({
          max: 50
        }));
        
        // Professional tier
        mockReq.user = { subscription_tier: 'professional' };
        authMiddleware.tierRateLimit(mockReq, mockRes, mockNext);
        expect(expressRateLimit).toHaveBeenCalledWith(expect.objectContaining({
          max: 200
        }));
        
        // Unknown tier (defaults to basic)
        mockReq.user = { subscription_tier: 'unknown' };
        authMiddleware.tierRateLimit(mockReq, mockRes, mockNext);
        expect(expressRateLimit).toHaveBeenCalledWith(expect.objectContaining({
          max: 10
        }));
      });
    });

    describe('Error Handler Middleware', () => {
      let errorHandler;
      
      beforeEach(() => {
        const { errorHandler: handler } = require('../src/middleware/errorHandler');
        errorHandler = handler;
      });

      test('handles 400 error', () => {
        const error = new Error('Bad request');
        error.status = 400;
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Bad request'
        });
      });

      test('handles 500 error', () => {
        const error = new Error('Server error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      test('handles error in development', () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Dev error');
        error.stack = 'Error stack';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Dev error',
          stack: 'Error stack'
        });
        
        process.env.NODE_ENV = 'test';
      });
    });

    describe('Rate Limiter', () => {
      test('loads and creates middleware', () => {
        const rateLimiter = require('../src/middleware/rateLimiter');
        expect(rateLimiter).toBeDefined();
        expect(typeof rateLimiter).toBe('function');
      });
    });
  });

  describe('Services', () => {
    describe('FinnhubService - Complete Coverage', () => {
      let FinnhubService, service;
      
      beforeEach(() => {
        jest.isolateModules(() => {
          FinnhubService = require('../src/services/finnhubService');
          service = new FinnhubService();
        });
      });

      test('constructor initializes correctly', () => {
        expect(service.apiKey).toBe('test-finnhub-key');
        expect(service.baseURL).toBe('https://finnhub.io/api/v1');
        expect(service.cache).toBeDefined();
      });

      test('quote - cache miss and hit', async () => {
        // Cache miss
        mockCache.get.mockReturnValueOnce(null);
        const result1 = await service.quote('AAPL');
        expect(mockCache.get).toHaveBeenCalledWith('quote_AAPL');
        expect(mockCache.set).toHaveBeenCalled();
        expect(result1).toBeDefined();
        
        // Cache hit
        const cachedData = { cached: true };
        mockCache.get.mockReturnValueOnce(cachedData);
        const result2 = await service.quote('AAPL');
        expect(result2).toEqual(cachedData);
      });

      test('quote - error handling', async () => {
        mockCache.get.mockReturnValueOnce(null);
        mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));
        
        await expect(service.quote('AAPL')).rejects.toThrow('API Error');
      });

      test('all API methods', async () => {
        // Test each method
        await service.getQuote('AAPL');
        await service.getCandles('AAPL', 'D', 1, 2);
        await service.getCompanyProfile('AAPL');
        await service.getCompanyNews('AAPL', '2023-01-01', '2023-12-31');
        await service.getBasicFinancials('AAPL');
        await service.getRecommendationTrends('AAPL');
        await service.getPriceTarget('AAPL');
        await service.getSupportResistance('AAPL', 'D');
        await service.getTechnicalIndicators('AAPL', 'sma', 'D', 1, 2, { timeperiod: 20 });
        
        expect(mockAxiosInstance.get).toHaveBeenCalledTimes(9);
      });

      test('formatCandles static method', () => {
        const validData = {
          t: [1234567890, 1234567900],
          o: [100, 101],
          h: [102, 103],
          l: [99, 100],
          c: [101, 102],
          v: [1000, 1100],
          s: 'ok'
        };
        
        const formatted = FinnhubService.formatCandles(validData);
        expect(formatted).toHaveLength(2);
        expect(formatted[0]).toEqual({
          timestamp: 1234567890,
          open: 100,
          high: 102,
          low: 99,
          close: 101,
          volume: 1000
        });
        
        // Test edge cases
        expect(FinnhubService.formatCandles({ s: 'no_data' })).toEqual([]);
        expect(FinnhubService.formatCandles(null)).toEqual([]);
        expect(FinnhubService.formatCandles(undefined)).toEqual([]);
        expect(FinnhubService.formatCandles({})).toEqual([]);
        expect(FinnhubService.formatCandles({ t: null })).toEqual([]);
        expect(FinnhubService.formatCandles({ t: [], o: [], h: [], l: [], c: [], v: [] })).toEqual([]);
      });

      test('getPeriodFromDate static method', () => {
        const periods = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];
        
        periods.forEach(period => {
          const date = FinnhubService.getPeriodFromDate(period);
          expect(date).toBeInstanceOf(Date);
          expect(date.getTime()).toBeLessThan(Date.now());
        });
        
        // Test default case
        const defaultDate = FinnhubService.getPeriodFromDate('INVALID');
        expect(defaultDate).toBeInstanceOf(Date);
      });
    });
  });

  describe('Validators', () => {
    const { body, param, query } = require('express-validator');
    
    test('auth validators', () => {
      const authValidators = require('../src/validators/auth');
      
      expect(authValidators.validateRegister).toBeDefined();
      expect(Array.isArray(authValidators.validateRegister)).toBe(true);
      
      expect(authValidators.validateLogin).toBeDefined();
      expect(authValidators.validateUpdateProfile).toBeDefined();
      expect(authValidators.validateChangePassword).toBeDefined();
    });

    test('market validators', () => {
      const marketValidators = require('../src/validators/market');
      
      expect(marketValidators.validateSymbol).toBeDefined();
      expect(marketValidators.validateCandleQuery).toBeDefined();
      expect(marketValidators.validateIndicatorQuery).toBeDefined();
    });

    test('portfolio validators', () => {
      const portfolioValidators = require('../src/validators/portfolio');
      
      expect(portfolioValidators.validateCreatePortfolio).toBeDefined();
      expect(portfolioValidators.validateUpdatePortfolio).toBeDefined();
      expect(portfolioValidators.validateTransaction).toBeDefined();
    });

    test('recommendation validators', () => {
      const recValidators = require('../src/validators/recommendation');
      
      expect(recValidators.validateApplyRecommendation).toBeDefined();
    });
  });

  describe('Routes', () => {
    test('all routes load correctly', () => {
      const routes = [
        'auth',
        'market',
        'portfolio',
        'recommendations',
        'strategies'
      ];
      
      routes.forEach(routeName => {
        const route = require(`../src/routes/${routeName}`);
        expect(route).toBeDefined();
        expect(typeof route).toBe('function');
      });
    });
  });

  describe('Config', () => {
    test('database config', () => {
      const database = require('../src/config/database');
      expect(database).toBeDefined();
    });

    test('supabase config', () => {
      const { supabase, supabaseAdmin } = require('../src/config/supabase');
      expect(supabase).toBeDefined();
      expect(supabaseAdmin).toBeDefined();
    });
  });

  describe('Utils', () => {
    test('logger creates instance with all methods', () => {
      const logger = require('../src/utils/logger');
      
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      
      // Test that methods can be called
      logger.info('Test info');
      logger.error('Test error');
      logger.warn('Test warning');
      logger.debug('Test debug');
    });
  });

  describe('Server', () => {
    test('server module loads', () => {
      const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const listenMock = jest.fn((port, cb) => cb && cb());
      
      jest.doMock('express', () => {
        const express = jest.requireActual('express');
        const app = express();
        app.listen = listenMock;
        return jest.fn(() => app);
      });
      
      expect(() => {
        jest.isolateModules(() => {
          require('../src/server');
        });
      }).not.toThrow();
      
      exitMock.mockRestore();
    });
  });
});
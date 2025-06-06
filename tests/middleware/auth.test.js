const { authenticate, authorize, validateApiKey, tierRateLimit } = require('../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const { auth } = require('../../src/config/database');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/config/database', () => ({
  auth: {
    getUser: jest.fn()
  },
  db: {
    from: jest.fn()
  }
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      jwt.verify.mockReturnValue({ sub: 'user-123' });
      auth.getUser.mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      });

      const mockProfile = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { tier: 'basic' }, 
          error: null 
        })
      };
      require('../../src/config/database').db.from.mockReturnValue(mockProfile);

      await authenticate(req, res, next);

      expect(req.user).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'basic'
      }));
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Authentication required'
      }));
    });

    it('should reject invalid token format', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Invalid token format'
      }));
    });

    it('should handle JWT verification errors', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Invalid token'
      }));
    });

    it('should handle user not found', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-123' });
      auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'User not found'
      }));
    });

    it('should handle database errors', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-123' });
      auth.getUser.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Database error'
      }));
    });
  });

  describe('authorize', () => {
    it('should allow access for matching tier', () => {
      req.user = { tier: 'premium' };
      const middleware = authorize(['basic', 'premium']);
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for non-matching tier', () => {
      req.user = { tier: 'basic' };
      const middleware = authorize(['premium', 'professional']);
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 403,
        message: 'Insufficient subscription tier'
      }));
    });

    it('should handle missing user', () => {
      const middleware = authorize(['basic']);
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 403,
        message: 'Insufficient subscription tier'
      }));
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      req.headers['x-api-key'] = 'valid-key';
      
      const mockApiKey = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'key-123', 
            is_active: true,
            user_id: 'user-123'
          }, 
          error: null 
        })
      };
      require('../../src/config/database').db.from.mockReturnValue(mockApiKey);

      await validateApiKey(req, res, next);

      expect(req.apiKey).toEqual(expect.objectContaining({
        id: 'key-123'
      }));
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing API key', async () => {
      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'API key required'
      }));
    });

    it('should reject invalid API key', async () => {
      req.headers['x-api-key'] = 'invalid-key';
      
      const mockApiKey = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: null 
        })
      };
      require('../../src/config/database').db.from.mockReturnValue(mockApiKey);

      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Invalid API key'
      }));
    });

    it('should reject inactive API key', async () => {
      req.headers['x-api-key'] = 'inactive-key';
      
      const mockApiKey = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'key-123', 
            is_active: false 
          }, 
          error: null 
        })
      };
      require('../../src/config/database').db.from.mockReturnValue(mockApiKey);

      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 401,
        message: 'Invalid API key'
      }));
    });
  });

  describe('tierRateLimit', () => {
    it('should create tier-specific rate limiters', () => {
      const basicLimiter = tierRateLimit.basic;
      const premiumLimiter = tierRateLimit.premium;
      const professionalLimiter = tierRateLimit.professional;

      expect(basicLimiter).toBeDefined();
      expect(premiumLimiter).toBeDefined();
      expect(professionalLimiter).toBeDefined();
      expect(typeof basicLimiter).toBe('function');
      expect(typeof premiumLimiter).toBe('function');
      expect(typeof professionalLimiter).toBe('function');
    });
  });
});
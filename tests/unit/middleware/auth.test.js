import { jest } from '@jest/globals';
import { authenticate, authorize, tierRateLimit } from '../../../src/middleware/auth.js';
import { mockUser, mockProfile } from '../../helpers/supabaseMocks.js';

// Mock dependencies
jest.mock('../../../src/config/supabase.js', () => ({
  verifySession: jest.fn(),
  supabaseAdmin: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis()
    })
  }
}));

// Import mocked modules
import { verifySession, supabaseAdmin } from '../../../src/config/supabase.js';

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token successfully', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      verifySession.mockResolvedValue(mockUser);
      
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await authenticate(req, res, next);

      expect(verifySession).toHaveBeenCalledWith('valid-token');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        ...mockProfile
      });
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing authorization header', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    });

    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      verifySession.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    });

    it('should create profile if it does not exist', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      verifySession.mockResolvedValue(mockUser);
      
      // First call returns no profile
      const mockFromChainNoProfile = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };
      
      // Second call for insert
      const mockFromChainInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockUser.id,
            email: mockUser.email,
            subscription_tier: 'basic'
          },
          error: null
        })
      };
      
      supabaseAdmin.from
        .mockReturnValueOnce(mockFromChainNoProfile)
        .mockReturnValueOnce(mockFromChainInsert);

      await authenticate(req, res, next);

      expect(supabaseAdmin.from).toHaveBeenCalledTimes(2);
      expect(mockFromChainInsert.insert).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        subscription_tier: 'basic'
      });
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle profile creation error', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      verifySession.mockResolvedValue(mockUser);
      
      const mockFromChainNoProfile = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };
      
      const mockFromChainInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' }
        })
      };
      
      supabaseAdmin.from
        .mockReturnValueOnce(mockFromChainNoProfile)
        .mockReturnValueOnce(mockFromChainInsert);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to create user profile'
      });
    });

    it('should handle verification errors', async () => {
      req.headers.authorization = 'Bearer error-token';
      
      verifySession.mockRejectedValue(new Error('Token verification failed'));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    });
  });

  describe('authorize', () => {
    it('should allow access for required tier', () => {
      req.user = { subscription_tier: 'premium' };
      
      const middleware = authorize('basic', 'premium');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for higher tier than required', () => {
      req.user = { subscription_tier: 'professional' };
      
      const middleware = authorize('premium');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for lower tier', () => {
      req.user = { subscription_tier: 'basic' };
      
      const middleware = authorize('premium', 'professional');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'This feature requires premium or professional subscription'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user', () => {
      const middleware = authorize('basic');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    });

    it('should handle missing subscription tier', () => {
      req.user = { id: 'user-id' }; // No subscription_tier
      
      const middleware = authorize('premium');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle multiple required tiers correctly', () => {
      req.user = { subscription_tier: 'premium' };
      
      // Should allow if user has any of the required tiers
      const middleware = authorize('professional', 'premium', 'basic');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('tierRateLimit', () => {
    it('should set rate limit for basic tier', () => {
      req.user = { subscription_tier: 'basic' };
      
      tierRateLimit(req, res, next);

      expect(req.rateLimit).toEqual({
        requests: 100,
        window: '1h'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set rate limit for premium tier', () => {
      req.user = { subscription_tier: 'premium' };
      
      tierRateLimit(req, res, next);

      expect(req.rateLimit).toEqual({
        requests: 1000,
        window: '1h'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set rate limit for professional tier', () => {
      req.user = { subscription_tier: 'professional' };
      
      tierRateLimit(req, res, next);

      expect(req.rateLimit).toEqual({
        requests: 10000,
        window: '1h'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should default to basic tier for unauthenticated users', () => {
      tierRateLimit(req, res, next);

      expect(req.rateLimit).toEqual({
        requests: 100,
        window: '1h'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should default to basic tier for unknown tiers', () => {
      req.user = { subscription_tier: 'unknown-tier' };
      
      tierRateLimit(req, res, next);

      expect(req.rateLimit).toEqual({
        requests: 100,
        window: '1h'
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('tier hierarchy', () => {
    const testCases = [
      { userTier: 'basic', requiredTiers: ['basic'], shouldAllow: true },
      { userTier: 'basic', requiredTiers: ['premium'], shouldAllow: false },
      { userTier: 'basic', requiredTiers: ['professional'], shouldAllow: false },
      { userTier: 'premium', requiredTiers: ['basic'], shouldAllow: true },
      { userTier: 'premium', requiredTiers: ['premium'], shouldAllow: true },
      { userTier: 'premium', requiredTiers: ['professional'], shouldAllow: false },
      { userTier: 'professional', requiredTiers: ['basic'], shouldAllow: true },
      { userTier: 'professional', requiredTiers: ['premium'], shouldAllow: true },
      { userTier: 'professional', requiredTiers: ['professional'], shouldAllow: true },
    ];

    testCases.forEach(({ userTier, requiredTiers, shouldAllow }) => {
      it(`should ${shouldAllow ? 'allow' : 'deny'} ${userTier} tier for ${requiredTiers.join(',')} requirement`, () => {
        req.user = { subscription_tier: userTier };
        
        const middleware = authorize(...requiredTiers);
        middleware(req, res, next);

        if (shouldAllow) {
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(next).not.toHaveBeenCalled();
        }
      });
    });
  });
});
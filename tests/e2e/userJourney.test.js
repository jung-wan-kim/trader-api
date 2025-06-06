import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../src/server.js';
import { generateTestUser, waitFor } from '../helpers/testUtils.js';
import {
  mockUser,
  mockProfile,
  mockPortfolio,
  mockRecommendation
} from '../helpers/supabaseMocks.js';

// Mock all dependencies for E2E testing
jest.mock('../../src/config/supabase.js', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }))
  },
  supabaseAdmin: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserById: jest.fn(),
        listUsers: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }))
  },
  verifySession: jest.fn()
}));

jest.mock('../../src/services/finnhubService.js', () => ({
  default: {
    getQuote: jest.fn(),
    getCandles: jest.fn(),
    searchStocks: jest.fn(),
    getCompanyProfile: jest.fn(),
    getNews: jest.fn()
  }
}));

jest.mock('../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/middleware/rateLimiter.js', () => ({
  createRateLimiter: jest.fn(() => (req, res, next) => next())
}));

// Import mocked modules
import { supabase, supabaseAdmin, verifySession } from '../../src/config/supabase.js';
import finnhubService from '../../src/services/finnhubService.js';

describe('User Journey E2E Tests', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    app = await createApp();
    testUser = generateTestUser();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Registration and Onboarding Flow', () => {
    it('should complete the full user registration to first recommendation flow', async () => {
      // Step 1: User Registration
      console.log('Step 1: User Registration');
      
      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token', refresh_token: 'refresh-token' }
        },
        error: null
      });

      const mockProfileChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProfile, email: testUser.email, id: 'test-user-id' },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockProfileChain);

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe(testUser.email);
      authToken = registerResponse.body.session.access_token;

      // Step 2: Login and Profile Verification
      console.log('Step 2: Login and Profile Verification');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: authToken }
        },
        error: null
      });

      verifySession.mockResolvedValue({ id: 'test-user-id', email: testUser.email });
      
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            id: 'test-user-id',
            email: testUser.email,
            subscription_tier: 'basic'
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(profileChain);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(loginResponse.status).toBe(200);
      authToken = loginResponse.body.session.access_token;

      // Step 3: Get User Profile
      console.log('Step 3: Get User Profile');
      
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.profile.subscription_tier).toBe('basic');

      // Step 4: Search for Stocks
      console.log('Step 4: Search for Stocks');
      
      finnhubService.searchStocks.mockResolvedValue([
        {
          description: 'APPLE INC',
          displaySymbol: 'AAPL',
          symbol: 'AAPL',
          type: 'Common Stock'
        }
      ]);

      const searchResponse = await request(app)
        .get('/api/market/search?q=apple')
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.results).toHaveLength(1);
      expect(searchResponse.body.results[0].symbol).toBe('AAPL');

      // Step 5: Get Stock Quote
      console.log('Step 5: Get Stock Quote');
      
      finnhubService.getQuote.mockResolvedValue({
        c: 150.00,
        h: 152.00,
        l: 148.00,
        o: 149.00,
        pc: 148.50,
        t: Date.now() / 1000
      });

      const quoteResponse = await request(app)
        .get('/api/market/quote/AAPL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(quoteResponse.status).toBe(200);
      expect(quoteResponse.body.quote.c).toBe(150.00);

      // Step 6: Create Portfolio
      console.log('Step 6: Create Portfolio');
      
      const portfolioCreateChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockPortfolio, name: 'My Trading Portfolio' },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(portfolioCreateChain);

      const portfolioResponse = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My Trading Portfolio',
          initial_capital: 10000
        });

      expect(portfolioResponse.status).toBe(201);
      expect(portfolioResponse.body.portfolio.name).toBe('My Trading Portfolio');

      // Step 7: Get Investment Strategies
      console.log('Step 7: Get Investment Strategies');
      
      const strategiesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'livermore-strategy',
              name: 'Jesse Livermore Strategy',
              description: 'Trend following and pyramiding',
              risk_level: 'high',
              time_horizon: 'short_term'
            }
          ],
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(strategiesChain);

      const strategiesResponse = await request(app)
        .get('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(strategiesResponse.status).toBe(200);

      // Step 8: Get Recommendations
      console.log('Step 8: Get Recommendations');
      
      const recommendationsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              ...mockRecommendation,
              strategy_name: 'Jesse Livermore Strategy',
              created_at: new Date().toISOString()
            }
          ],
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(recommendationsChain);

      const recommendationsResponse = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.body.recommendations).toHaveLength(1);
      expect(recommendationsResponse.body.recommendations[0].symbol).toBe('AAPL');

      // Step 9: Execute Trade based on Recommendation
      console.log('Step 9: Execute Trade based on Recommendation');
      
      const tradeChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'trade-123',
            portfolio_id: mockPortfolio.id,
            symbol: 'AAPL',
            action: 'buy',
            quantity: 10,
            entry_price: 150.00,
            status: 'executed'
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(tradeChain);

      const tradeResponse = await request(app)
        .post('/api/portfolios/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolio_id: mockPortfolio.id,
          recommendation_id: mockRecommendation.id,
          quantity: 10
        });

      expect(tradeResponse.status).toBe(201);
      expect(tradeResponse.body.trade.symbol).toBe('AAPL');
      expect(tradeResponse.body.trade.quantity).toBe(10);

      // Step 10: Check Portfolio Performance
      console.log('Step 10: Check Portfolio Performance');
      
      const performanceChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            total_value: 11500,
            total_profit_loss: 1500,
            total_profit_loss_percentage: 15.0,
            winning_trades: 1,
            losing_trades: 0,
            win_rate: 1.0
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(performanceChain);

      const performanceResponse = await request(app)
        .get(`/api/portfolios/${mockPortfolio.id}/performance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.body.performance.total_profit_loss).toBe(1500);
      expect(performanceResponse.body.performance.win_rate).toBe(1.0);

      console.log('✅ Complete user journey test passed!');
    });
  });

  describe('Subscription Upgrade Flow', () => {
    it('should handle subscription upgrade from basic to premium', async () => {
      // Setup authenticated user
      verifySession.mockResolvedValue({ id: 'test-user-id', email: testUser.email });
      
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            subscription_tier: 'basic'
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(profileChain);

      authToken = 'valid-auth-token';

      // Step 1: Check current subscription status
      console.log('Step 1: Check current subscription');
      
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.profile.subscription_tier).toBe('basic');

      // Step 2: Try to access premium feature (should fail)
      console.log('Step 2: Try premium feature with basic subscription');
      
      const premiumFeatureResponse = await request(app)
        .get('/api/recommendations/advanced')
        .set('Authorization', `Bearer ${authToken}`);

      expect(premiumFeatureResponse.status).toBe(403);
      expect(premiumFeatureResponse.body.message).toContain('premium');

      // Step 3: Upgrade subscription
      console.log('Step 3: Upgrade subscription');
      
      const subscriptionChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-premium',
            user_id: 'test-user-id',
            tier: 'premium',
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          error: null
        })
      };
      
      const profileUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            subscription_tier: 'premium'
          },
          error: null
        })
      };
      
      supabaseAdmin.from
        .mockReturnValueOnce(subscriptionChain)
        .mockReturnValueOnce(profileUpdateChain);

      const upgradeResponse = await request(app)
        .post('/api/auth/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tier: 'premium',
          payment_method_id: 'pm_test_123'
        });

      expect(upgradeResponse.status).toBe(200);
      expect(upgradeResponse.body.subscription.tier).toBe('premium');

      // Step 4: Verify updated profile
      console.log('Step 4: Verify updated profile');
      
      const updatedProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            subscription_tier: 'premium',
            subscriptions: {
              tier: 'premium',
              status: 'active'
            }
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(updatedProfileChain);

      const updatedProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(updatedProfileResponse.status).toBe(200);
      expect(updatedProfileResponse.body.profile.subscription_tier).toBe('premium');

      // Step 5: Access premium feature (should succeed)
      console.log('Step 5: Access premium feature');
      
      // Update verifySession to return user with premium tier
      verifySession.mockResolvedValue({ 
        id: 'test-user-id', 
        email: testUser.email,
        subscription_tier: 'premium'
      });
      
      const premiumChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            subscription_tier: 'premium'
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(premiumChain);

      const advancedRecommendationsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              ...mockRecommendation,
              confidence_score: 0.95,
              advanced_analysis: true
            }
          ],
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(advancedRecommendationsChain);

      const premiumFeatureSuccessResponse = await request(app)
        .get('/api/recommendations/advanced')
        .set('Authorization', `Bearer ${authToken}`);

      expect(premiumFeatureSuccessResponse.status).toBe(200);
      expect(premiumFeatureSuccessResponse.body.recommendations[0].advanced_analysis).toBe(true);

      console.log('✅ Subscription upgrade flow test passed!');
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle and recover from various error scenarios', async () => {
      authToken = 'valid-auth-token';
      verifySession.mockResolvedValue({ id: 'test-user-id', email: testUser.email });

      // Step 1: Handle API timeout/retry
      console.log('Step 1: Test API timeout handling');
      
      finnhubService.getQuote
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({
          c: 150.00,
          h: 152.00,
          l: 148.00,
          o: 149.00,
          pc: 148.50,
          t: Date.now() / 1000
        });

      // First request should fail
      const failedQuoteResponse = await request(app)
        .get('/api/market/quote/AAPL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(failedQuoteResponse.status).toBe(500);

      // Second request should succeed (simulating retry)
      const successQuoteResponse = await request(app)
        .get('/api/market/quote/AAPL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(successQuoteResponse.status).toBe(200);

      // Step 2: Handle database connection issues
      console.log('Step 2: Test database error handling');
      
      const dbErrorChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      supabaseAdmin.from.mockReturnValue(dbErrorChain);

      const dbErrorResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dbErrorResponse.status).toBe(500);

      // Recovery: Database connection restored
      const recoveryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(recoveryChain);

      const recoveryResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryResponse.status).toBe(200);

      // Step 3: Handle token expiration and refresh
      console.log('Step 3: Test token expiration handling');
      
      verifySession.mockResolvedValueOnce(null); // Expired token
      
      const expiredTokenResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(expiredTokenResponse.status).toBe(401);

      // Token refresh
      supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        },
        error: null
      });

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'valid-refresh-token' });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.session.access_token).toBe('new-access-token');

      console.log('✅ Error recovery flow test passed!');
    });
  });

  describe('Concurrent User Actions', () => {
    it('should handle multiple concurrent API requests properly', async () => {
      authToken = 'valid-auth-token';
      verifySession.mockResolvedValue({ id: 'test-user-id', email: testUser.email });
      
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(profileChain);

      // Mock multiple API responses
      finnhubService.getQuote.mockResolvedValue({
        c: 150.00, h: 152.00, l: 148.00, o: 149.00, pc: 148.50, t: Date.now() / 1000
      });
      
      finnhubService.searchStocks.mockResolvedValue([
        { symbol: 'AAPL', description: 'Apple Inc' }
      ]);
      
      finnhubService.getNews.mockResolvedValue([
        { headline: 'Test news', datetime: Date.now() / 1000 }
      ]);

      // Execute multiple concurrent requests
      const requests = [
        request(app).get('/api/market/quote/AAPL').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/market/search?q=apple').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/market/news/AAPL').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/auth/profile').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/recommendations').set('Authorization', `Bearer ${authToken}`)
      ];

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      console.log('✅ Concurrent requests test passed!');
    });
  });
});
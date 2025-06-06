import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/server.js';
import { generateLoad, measureExecutionTime } from '../helpers/testUtils.js';
import {
  createMockSupabaseClient,
  createMockSupabaseAdmin,
  mockUser,
  mockProfile
} from '../helpers/supabaseMocks.js';

// Mock dependencies for performance testing
jest.mock('../../src/config/supabase.js', () => ({
  supabase: createMockSupabaseClient(),
  supabaseAdmin: createMockSupabaseAdmin(),
  verifySession: jest.fn()
}));

jest.mock('../../src/services/finnhubService.js', () => ({
  default: {
    getQuote: jest.fn(),
    searchStocks: jest.fn(),
    getCandles: jest.fn(),
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
import { verifySession, supabaseAdmin } from '../../src/config/supabase.js';
import finnhubService from '../../src/services/finnhubService.js';

describe('Performance Load Tests', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await createApp();
    authToken = 'valid-auth-token';
    
    // Setup default mocks for authenticated requests
    verifySession.mockResolvedValue(mockUser);
    
    const mockProfileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null
      })
    };
    supabaseAdmin.from.mockReturnValue(mockProfileChain);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks for each test
    verifySession.mockResolvedValue(mockUser);
    
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null
      }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };
    supabaseAdmin.from.mockReturnValue(mockChain);
  });

  describe('Authentication Endpoint Performance', () => {
    it('should handle high-frequency login requests', async () => {
      const { supabase } = await import('../../src/config/supabase.js');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'test-token', refresh_token: 'refresh-token' }
        },
        error: null
      });

      const loginRequest = async () => {
        return request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });
      };

      const results = await generateLoad(loginRequest, 10, 50);

      expect(results.totalRequests).toBe(50);
      expect(results.averageTime).toBeLessThan(200); // Should respond within 200ms on average
      expect(results.maxTime).toBeLessThan(1000); // No request should take more than 1 second
      expect(results.errors).toBe(0); // No errors should occur

      console.log('Login Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });

    it('should handle concurrent registration requests', async () => {
      const { supabase } = await import('../../src/config/supabase.js');
      
      supabase.auth.signUp.mockImplementation(async ({ email }) => ({
        data: {
          user: { id: `user-${Date.now()}-${Math.random()}`, email },
          session: { access_token: 'test-token', refresh_token: 'refresh-token' }
        },
        error: null
      }));

      const registrationRequest = async () => {
        const uniqueEmail = `test-${Date.now()}-${Math.random()}@example.com`;
        return request(app)
          .post('/api/auth/register')
          .send({
            email: uniqueEmail,
            password: 'password123',
            name: 'Test User',
            investmentStyle: 'moderate'
          });
      };

      const results = await generateLoad(registrationRequest, 5, 25);

      expect(results.totalRequests).toBe(25);
      expect(results.averageTime).toBeLessThan(500); // Registration can be slower
      expect(results.errors).toBe(0);

      console.log('Registration Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });
  });

  describe('Market Data Endpoint Performance', () => {
    it('should handle high-frequency quote requests', async () => {
      finnhubService.getQuote.mockResolvedValue({
        c: 150.00 + Math.random() * 10, // Add some randomness
        h: 152.00 + Math.random() * 10,
        l: 148.00 + Math.random() * 10,
        o: 149.00 + Math.random() * 10,
        pc: 148.50 + Math.random() * 10,
        t: Date.now() / 1000
      });

      const quoteRequest = async () => {
        return request(app)
          .get('/api/market/quote/AAPL')
          .set('Authorization', `Bearer ${authToken}`);
      };

      const results = await generateLoad(quoteRequest, 20, 100);

      expect(results.totalRequests).toBe(100);
      expect(results.averageTime).toBeLessThan(100); // Quote requests should be very fast
      expect(results.maxTime).toBeLessThan(500);
      expect(results.errors).toBe(0);

      console.log('Quote Request Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });

    it('should handle concurrent search requests', async () => {
      finnhubService.searchStocks.mockImplementation(async (query) => {
        // Simulate search delay
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
        return [
          {
            description: `${query.toUpperCase()} INC`,
            displaySymbol: query.toUpperCase(),
            symbol: query.toUpperCase(),
            type: 'Common Stock'
          }
        ];
      });

      const searchTerms = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      const searchRequest = async () => {
        const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        return request(app)
          .get(`/api/market/search?q=${term}`)
          .set('Authorization', `Bearer ${authToken}`);
      };

      const results = await generateLoad(searchRequest, 15, 75);

      expect(results.totalRequests).toBe(75);
      expect(results.averageTime).toBeLessThan(150);
      expect(results.errors).toBe(0);

      console.log('Search Request Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });
  });

  describe('Database Operation Performance', () => {
    it('should handle concurrent profile updates', async () => {
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(async () => {
          // Simulate database delay
          await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
          return {
            data: { ...mockProfile, name: `Updated Name ${Date.now()}` },
            error: null
          };
        })
      };
      supabaseAdmin.from.mockReturnValue(updateChain);

      const updateRequest = async () => {
        return request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Updated Name ${Date.now()}`,
            investment_style: 'moderate'
          });
      };

      const results = await generateLoad(updateRequest, 10, 50);

      expect(results.totalRequests).toBe(50);
      expect(results.averageTime).toBeLessThan(300); // Database operations can be slower
      expect(results.errors).toBe(0);

      console.log('Profile Update Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });

    it('should handle high-frequency recommendation queries', async () => {
      const recommendationChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(async () => {
          // Simulate complex query delay
          await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
          return {
            data: [
              {
                id: `rec-${Date.now()}`,
                symbol: 'AAPL',
                action: 'buy',
                confidence_score: 0.85,
                entry_price: 150.00,
                stop_loss: 145.00,
                take_profit: 160.00,
                reasoning: 'Performance test recommendation'
              }
            ],
            error: null
          };
        })
      };
      supabaseAdmin.from.mockReturnValue(recommendationChain);

      const recommendationRequest = async () => {
        return request(app)
          .get('/api/recommendations')
          .set('Authorization', `Bearer ${authToken}`);
      };

      const results = await generateLoad(recommendationRequest, 8, 40);

      expect(results.totalRequests).toBe(40);
      expect(results.averageTime).toBeLessThan(400); // Complex queries can take longer
      expect(results.errors).toBe(0);

      console.log('Recommendation Query Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });
  });

  describe('Mixed Workload Performance', () => {
    it('should handle mixed API operations under load', async () => {
      // Setup different mock responses
      finnhubService.getQuote.mockResolvedValue({
        c: 150.00, h: 152.00, l: 148.00, o: 149.00, pc: 148.50, t: Date.now() / 1000
      });

      const mixedOperations = [
        // Profile operations (30%)
        () => request(app).get('/api/auth/profile').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/auth/profile').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/auth/profile').set('Authorization', `Bearer ${authToken}`),
        
        // Market data operations (50%)
        () => request(app).get('/api/market/quote/AAPL').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/market/quote/GOOGL').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/market/search?q=apple').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/market/search?q=google').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/market/news/AAPL').set('Authorization', `Bearer ${authToken}`),
        
        // Recommendation operations (20%)
        () => request(app).get('/api/recommendations').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/strategies').set('Authorization', `Bearer ${authToken}`)
      ];

      const mixedRequest = async () => {
        const operation = mixedOperations[Math.floor(Math.random() * mixedOperations.length)];
        return operation();
      };

      const results = await generateLoad(mixedRequest, 12, 60);

      expect(results.totalRequests).toBe(60);
      expect(results.averageTime).toBeLessThan(300); // Mixed workload average
      expect(results.errors).toBe(0);

      console.log('Mixed Workload Performance Results:', {
        totalRequests: results.totalRequests,
        averageTime: `${results.averageTime.toFixed(2)}ms`,
        minTime: `${results.minTime.toFixed(2)}ms`,
        maxTime: `${results.maxTime.toFixed(2)}ms`,
        errors: results.errors
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage();

      finnhubService.getQuote.mockResolvedValue({
        c: 150.00, h: 152.00, l: 148.00, o: 149.00, pc: 148.50, t: Date.now() / 1000
      });

      const sustainedRequest = async () => {
        return request(app)
          .get('/api/market/quote/AAPL')
          .set('Authorization', `Bearer ${authToken}`);
      };

      // Run sustained load for 200 requests
      const results = await generateLoad(sustainedRequest, 5, 200);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerRequest = memoryIncrease / results.totalRequests;

      expect(results.totalRequests).toBe(200);
      expect(results.errors).toBe(0);
      
      // Memory increase should be reasonable (less than 1MB per request)
      expect(memoryIncreasePerRequest).toBeLessThan(1024 * 1024);

      console.log('Memory Usage Results:', {
        totalRequests: results.totalRequests,
        initialHeapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        finalHeapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        memoryPerRequest: `${(memoryIncreasePerRequest / 1024).toFixed(2)}KB`,
        averageResponseTime: `${results.averageTime.toFixed(2)}ms`
      });
    });
  });

  describe('Response Time Percentiles', () => {
    it('should meet response time SLA requirements', async () => {
      finnhubService.getQuote.mockImplementation(async () => {
        // Simulate variable response times
        const delay = Math.random() * 50; // 0-50ms delay
        await new Promise(resolve => setTimeout(resolve, delay));
        return {
          c: 150.00, h: 152.00, l: 148.00, o: 149.00, pc: 148.50, t: Date.now() / 1000
        };
      });

      const requests = [];
      const numberOfRequests = 100;

      // Execute all requests and measure individual times
      for (let i = 0; i < numberOfRequests; i++) {
        const measureRequest = async () => {
          return request(app)
            .get('/api/market/quote/AAPL')
            .set('Authorization', `Bearer ${authToken}`);
        };

        requests.push(measureExecutionTime(measureRequest));
      }

      const results = await Promise.all(requests);
      const responseTimes = results.map(r => r.duration).sort((a, b) => a - b);

      // Calculate percentiles
      const p50 = responseTimes[Math.floor(numberOfRequests * 0.5)];
      const p90 = responseTimes[Math.floor(numberOfRequests * 0.9)];
      const p95 = responseTimes[Math.floor(numberOfRequests * 0.95)];
      const p99 = responseTimes[Math.floor(numberOfRequests * 0.99)];

      // SLA requirements
      expect(p50).toBeLessThan(100); // 50% of requests under 100ms
      expect(p90).toBeLessThan(200); // 90% of requests under 200ms
      expect(p95).toBeLessThan(300); // 95% of requests under 300ms
      expect(p99).toBeLessThan(500); // 99% of requests under 500ms

      console.log('Response Time Percentiles:', {
        p50: `${p50.toFixed(2)}ms`,
        p90: `${p90.toFixed(2)}ms`,
        p95: `${p95.toFixed(2)}ms`,
        p99: `${p99.toFixed(2)}ms`,
        min: `${responseTimes[0].toFixed(2)}ms`,
        max: `${responseTimes[numberOfRequests - 1].toFixed(2)}ms`
      });
    });
  });
});
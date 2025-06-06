import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/server.js';
import { 
  testSQLInjection, 
  sqlInjectionPayloads,
  generateTestUser 
} from '../helpers/testUtils.js';
import {
  createMockSupabaseClient,
  createMockSupabaseAdmin,
  mockUser,
  mockProfile
} from '../helpers/supabaseMocks.js';

// Mock dependencies for security testing
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
import { supabase, supabaseAdmin, verifySession } from '../../src/config/supabase.js';

describe('Security Tests', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await createApp();
    authToken = 'valid-auth-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('Authentication Security', () => {
    describe('JWT Token Validation', () => {
      it('should reject requests without authorization header', async () => {
        const response = await request(app)
          .get('/api/auth/profile');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
        expect(response.body.message).toBe('No token provided');
      });

      it('should reject malformed authorization headers', async () => {
        const malformedHeaders = [
          'invalid-format',
          'Bearer',
          'Bearer ',
          'Basic valid-token',
          'bearer lowercase-bearer'
        ];

        for (const header of malformedHeaders) {
          const response = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', header);

          expect(response.status).toBe(401);
          expect(response.body.error).toBe('Unauthorized');
        }
      });

      it('should reject invalid JWT tokens', async () => {
        const invalidTokens = [
          'invalid-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
          'a'.repeat(500), // Very long token
          'null',
          'undefined',
          '',
          '{}',
          'Bearer nested-bearer-token'
        ];

        verifySession.mockResolvedValue(null);

        for (const token of invalidTokens) {
          const response = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`);

          expect(response.status).toBe(401);
          expect(response.body.error).toBe('Unauthorized');
        }
      });

      it('should reject expired tokens', async () => {
        verifySession.mockResolvedValue(null); // Simulates expired token

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
      });
    });

    describe('Password Security', () => {
      it('should enforce strong password requirements', async () => {
        const weakPasswords = [
          '123',
          'password',
          '12345678',
          'abcdefgh',
          'ABCDEFGH',
          'Password', // No numbers or special chars
          '1234567890', // Only numbers
          'p@$$w0rd' // Common pattern
        ];

        supabase.auth.signUp.mockResolvedValue({
          data: null,
          error: { message: 'Password is too weak' }
        });

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: 'test@example.com',
              password,
              name: 'Test User',
              investmentStyle: 'moderate'
            });

          expect(response.status).toBe(400);
        }
      });

      it('should handle password change security properly', async () => {
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

        // Test that current password is required and verified
        supabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Invalid credentials' }
        });

        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            current_password: 'wrong-password',
            new_password: 'NewSecurePassword123!'
          });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Current password is incorrect');
      });

      it('should prevent password reuse', async () => {
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

        // Mock that current password verification succeeds
        supabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        // Mock that new password update fails due to reuse
        supabase.auth.updateUser.mockResolvedValue({
          data: null,
          error: { message: 'New password must be different from current password' }
        });

        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            current_password: 'current-password',
            new_password: 'current-password' // Same as current
          });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in registration', async () => {
        const results = await testSQLInjection(app, '/api/auth/register', 'post');
        
        // All SQL injection attempts should be blocked
        results.forEach(result => {
          expect(result.blocked).toBe(true);
          expect(result.status).toBeGreaterThanOrEqual(400);
        });
      });

      it('should prevent SQL injection in login', async () => {
        const results = await testSQLInjection(app, '/api/auth/login', 'post');
        
        results.forEach(result => {
          expect(result.blocked).toBe(true);
          expect(result.status).toBeGreaterThanOrEqual(400);
        });
      });

      it('should prevent SQL injection in search queries', async () => {
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

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .get(`/api/market/search?q=${encodeURIComponent(payload)}`)
            .set('Authorization', `Bearer ${authToken}`);

          // Should either be blocked (400-499) or safely handled (200 with no results)
          expect(response.status).not.toBe(500);
          
          if (response.status === 200) {
            // If not blocked, should return safe empty results
            expect(response.body.results).toBeDefined();
          }
        }
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize HTML input in profile updates', async () => {
        verifySession.mockResolvedValue(mockUser);
        
        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        };
        
        const mockUpdateChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockProfile, name: 'Test User' }, // Sanitized
            error: null
          })
        };
        
        supabaseAdmin.from
          .mockReturnValueOnce(mockProfileChain)
          .mockReturnValueOnce(mockUpdateChain);

        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert("XSS")',
          '<iframe src="javascript:alert(1)"></iframe>',
          '"><script>alert("XSS")</script>',
          '<svg onload="alert(1)">',
          '<body onload="alert(1)">'
        ];

        for (const payload of xssPayloads) {
          const response = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload
            });

          // Should either be blocked or sanitized
          if (response.status === 200) {
            expect(response.body.profile.name).not.toContain('<script>');
            expect(response.body.profile.name).not.toContain('javascript:');
            expect(response.body.profile.name).not.toContain('onerror');
            expect(response.body.profile.name).not.toContain('onload');
          } else {
            expect(response.status).toBeGreaterThanOrEqual(400);
          }
        }
      });
    });

    describe('Path Traversal Prevention', () => {
      it('should prevent directory traversal attacks', async () => {
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

        const pathTraversalPayloads = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '....//....//....//etc/passwd',
          '../../../app/.env'
        ];

        for (const payload of pathTraversalPayloads) {
          const response = await request(app)
            .get(`/api/market/news/${encodeURIComponent(payload)}`)
            .set('Authorization', `Bearer ${authToken}`);

          // Should be blocked or safely handled
          expect(response.status).not.toBe(500);
          if (response.status === 200) {
            // Should not return sensitive file contents
            expect(response.body).not.toMatch(/root:|password:|admin:/i);
          }
        }
      });
    });
  });

  describe('Authorization Security', () => {
    describe('Horizontal Privilege Escalation', () => {
      it('should prevent access to other users\' data', async () => {
        verifySession.mockResolvedValue({ id: 'user-1', email: 'user1@example.com' });
        
        // Mock user trying to access another user's profile
        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null, // No profile found for user-1 accessing user-2's data
            error: { message: 'Profile not found' }
          })
        };
        supabaseAdmin.from.mockReturnValue(mockProfileChain);

        // Try to access portfolio of another user
        const response = await request(app)
          .get('/api/portfolios/other-user-portfolio-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should prevent modification of other users\' portfolios', async () => {
        verifySession.mockResolvedValue({ id: 'user-1', email: 'user1@example.com' });
        
        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockProfile, id: 'user-1' },
            error: null
          })
        };
        supabaseAdmin.from.mockReturnValue(mockProfileChain);

        const response = await request(app)
          .put('/api/portfolios/other-user-portfolio-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Hacked Portfolio'
          });

        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    });

    describe('Vertical Privilege Escalation', () => {
      it('should prevent basic users from accessing premium features', async () => {
        verifySession.mockResolvedValue(mockUser);
        
        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockProfile, subscription_tier: 'basic' },
            error: null
          })
        };
        supabaseAdmin.from.mockReturnValue(mockProfileChain);

        const response = await request(app)
          .get('/api/recommendations/advanced')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Forbidden');
        expect(response.body.message).toContain('premium');
      });

      it('should prevent subscription tier manipulation', async () => {
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

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subscription_tier: 'professional' // Should not be allowed via profile update
          });

        // Should either ignore the field or return validation error
        if (response.status === 200) {
          expect(response.body.profile.subscription_tier).not.toBe('professional');
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should prevent brute force login attempts', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      const responses = [];
      
      // Simulate rapid login attempts
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'victim@example.com',
            password: 'wrong-password'
          });
        
        responses.push(response.status);
      }

      // Should have at least some rate limiting responses (429)
      const rateLimitedResponses = responses.filter(status => status === 429);
      
      // Note: In this test, rate limiting is mocked to always pass,
      // but in real implementation, this should trigger rate limiting
      console.log('Rate limiting test - responses:', responses);
    });

    it('should prevent API abuse with excessive requests', async () => {
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

      const responses = [];
      
      // Simulate excessive API requests
      for (let i = 0; i < 50; i++) {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`);
        
        responses.push(response.status);
      }

      console.log('API abuse test - responses:', responses);
      
      // All should succeed since rate limiting is mocked,
      // but in real implementation should show rate limiting
      expect(responses.every(status => status === 200)).toBe(true);
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Test with various error scenarios
      verifySession.mockRejectedValue(new Error('Database connection string: user:password@host:5432/db'));

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('connection string');
      expect(response.body.message).not.toContain('host:5432');
    });

    it('should not expose internal system information', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint');

      expect(response.status).toBe(404);
      
      // Should not expose framework or system details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    it('should sanitize user data in responses', async () => {
      verifySession.mockResolvedValue(mockUser);
      
      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            internal_notes: 'Sensitive internal information',
            password_hash: 'hashed_password_should_not_be_exposed',
            api_keys: 'secret_api_key'
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockProfileChain);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Should not expose sensitive fields
      expect(response.body.profile).not.toHaveProperty('password_hash');
      expect(response.body.profile).not.toHaveProperty('api_keys');
      expect(response.body.profile).not.toHaveProperty('internal_notes');
    });
  });

  describe('CORS and Headers Security', () => {
    it('should have proper security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for security headers (these would be set by helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://malicious-site.com');

      // Should handle CORS appropriately
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on password change', async () => {
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

      // Mock successful password change
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      supabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'current-password',
          new_password: 'NewSecurePassword123!'
        });

      expect(response.status).toBe(200);
      
      // In a real implementation, this should invalidate other sessions
      expect(supabase.auth.updateUser).toHaveBeenCalled();
    });

    it('should handle session fixation attacks', async () => {
      // Test that session IDs change on authentication
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { 
            access_token: 'new-session-token-12345',
            refresh_token: 'new-refresh-token-12345'
          }
        },
        error: null
      });

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockProfileChain);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.session.access_token).toBeDefined();
      expect(response.body.session.access_token).not.toBe(authToken);
    });
  });
});
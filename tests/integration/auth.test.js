import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';
import { generateTestUser, expectError, expectValidationError } from '../helpers/testUtils.js';
import {
  createMockSupabaseClient,
  createMockSupabaseAdmin,
  mockUser,
  mockProfile
} from '../helpers/supabaseMocks.js';

// Mock dependencies
jest.mock('../../src/config/supabase.js', () => ({
  supabase: createMockSupabaseClient(),
  supabaseAdmin: createMockSupabaseAdmin(),
  verifySession: jest.fn()
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

describe('Auth Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const testUser = generateTestUser();
      
      // Mock successful signup
      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: testUser.email },
          session: { access_token: 'test-token', refresh_token: 'refresh-token' }
        },
        error: null
      });

      // Mock profile creation
      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProfile, email: testUser.email, id: 'new-user-id' },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Registration successful',
        user: expect.objectContaining({
          id: 'new-user-id',
          email: testUser.email,
          name: testUser.name
        }),
        session: expect.objectContaining({
          access_token: 'test-token'
        })
      });

      // Verify calls were made correctly
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            name: testUser.name,
            investment_style: testUser.investmentStyle
          }
        }
      });

      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
      expect(mockFromChain.insert).toHaveBeenCalledWith({
        id: 'new-user-id',
        email: testUser.email,
        name: testUser.name,
        investment_style: testUser.investmentStyle,
        subscription_tier: 'basic',
        created_at: expect.any(String)
      });
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Too short
        name: '', // Empty
        investmentStyle: 'invalid-style'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expectValidationError(response);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'email' }),
          expect.objectContaining({ path: 'password' }),
          expect.objectContaining({ path: 'name' }),
          expect.objectContaining({ path: 'investmentStyle' })
        ])
      );
    });

    it('should handle duplicate email error', async () => {
      const testUser = generateTestUser();
      
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expectError(response, 400, 'User already registered');
    });

    it('should rollback on profile creation failure', async () => {
      const testUser = generateTestUser();
      
      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        },
        error: null
      });

      // Mock profile creation failure
      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile creation failed' }
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(500);
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'access-token', refresh_token: 'refresh-token' }
        },
        error: null
      });

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email
        }),
        session: expect.objectContaining({
          access_token: 'access-token'
        })
      });
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expectError(response, 401, 'Invalid login credentials');
    });

    it('should validate email format', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials);

      expectValidationError(response, 'email');
    });

    it('should require both email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expectValidationError(response);
      expect(response.body.errors).toHaveLength(2);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Token refreshed successfully',
        session: expect.objectContaining({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        })
      });
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expectError(response, 400, 'Refresh token is required');
    });

    it('should reject invalid refresh token', async () => {
      supabase.auth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid refresh token' }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token' });

      expectError(response, 401, 'Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with token', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should logout successfully without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get profile for authenticated user', async () => {
      const token = 'valid-token';
      
      verifySession.mockResolvedValue(mockUser);
      
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockProfile,
            subscriptions: { tier: 'premium', status: 'active' },
            portfolio_stats: { total_value: 15000, win_rate: 0.65 }
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.profile).toMatchObject({
        id: mockProfile.id,
        email: mockProfile.email,
        name: mockProfile.name,
        subscriptions: expect.any(Object),
        portfolio_stats: expect.any(Object)
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expectError(response, 401, 'No token provided');
    });

    it('should handle invalid token', async () => {
      verifySession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expectError(response, 401, 'Invalid or expired token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update profile successfully', async () => {
      const token = 'valid-token';
      const updateData = {
        name: 'Updated Name',
        investment_style: 'aggressive',
        risk_tolerance: 'high'
      };
      
      verifySession.mockResolvedValue(mockUser);
      
      // Mock profile retrieval
      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      
      // Mock profile update
      const mockUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProfile, ...updateData },
          error: null
        })
      };
      
      supabaseAdmin.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValueOnce(mockUpdateChain);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Profile updated successfully',
        profile: expect.objectContaining(updateData)
      });
    });

    it('should validate investment style', async () => {
      const token = 'valid-token';
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
        .set('Authorization', `Bearer ${token}`)
        .send({
          investment_style: 'invalid-style'
        });

      expectValidationError(response, 'investment_style');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const token = 'valid-token';
      const passwordData = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };
      
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

      // Mock current password verification
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock password update
      supabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject incorrect current password', async () => {
      const token = 'valid-token';
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

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'newpassword123'
        });

      expectError(response, 401, 'Current password is incorrect');
    });

    it('should validate password strength', async () => {
      const token = 'valid-token';
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
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'oldpassword',
          new_password: '123' // Too weak
        });

      expectValidationError(response, 'new_password');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'https://example.com/reset-password' }
      );
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expectValidationError(response, 'email');
    });
  });

  describe('DELETE /api/auth/account', () => {
    it('should delete account successfully', async () => {
      const token = 'valid-token';
      verifySession.mockResolvedValue(mockUser);
      
      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };
      
      const mockDeleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      
      supabaseAdmin.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValueOnce(mockDeleteChain);

      // Mock password verification
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock auth user deletion
      supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should require password confirmation', async () => {
      const token = 'valid-token';
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
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expectValidationError(response, 'password');
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // This test verifies that rate limiting middleware is applied
      // The actual rate limiting logic is tested in the rate limiter unit tests
      
      const { createRateLimiter } = await import('../../src/middleware/rateLimiter.js');
      expect(createRateLimiter).toHaveBeenCalled();
    });
  });
});
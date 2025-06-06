import { jest } from '@jest/globals';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  deleteAccount
} from '../../../src/controllers/authController.js';
import {
  mockUser,
  mockProfile,
  resetSupabaseMocks
} from '../../helpers/supabaseMocks.js';
import { generateTestUser } from '../../helpers/testUtils.js';

// Mock dependencies
jest.mock('../../../src/config/supabase.js', () => ({
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

jest.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import mocked modules
import { supabase, supabaseAdmin } from '../../../src/config/supabase.js';
import logger from '../../../src/utils/logger.js';

describe('AuthController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    resetSupabaseMocks(supabase, supabaseAdmin);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const testUser = generateTestUser();
      req.body = testUser;

      // Mock validation result
      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      // Mock Supabase responses
      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        },
        error: null
      });

      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProfile, email: testUser.email },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await register(req, res, next);

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
      expect(mockFromChain.insert).toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Registration successful',
        user: expect.objectContaining({
          id: 'new-user-id',
          email: testUser.email
        }),
        session: expect.any(Object)
      });
    });

    it('should handle validation errors', async () => {
      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({
          isEmpty: () => false,
          array: () => [{ msg: 'Invalid email', param: 'email' }]
        }))
      }));

      const { validationResult } = await import('express-validator');
      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Invalid email', param: 'email' }]
      });
    });

    it('should handle signup errors', async () => {
      const testUser = generateTestUser();
      req.body = testUser;

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Registration failed',
        message: 'Email already exists'
      });
    });

    it('should rollback auth user if profile creation fails', async () => {
      const testUser = generateTestUser();
      req.body = testUser;

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        },
        error: null
      });

      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile creation failed' }
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await register(req, res, next);

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id');
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'test-token' }
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

      await login(req, res, next);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: req.body.email,
        password: req.body.password
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email
        }),
        session: expect.any(Object)
      });
    });

    it('should handle invalid credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid login credentials'
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      req.body = { refresh_token: 'valid-refresh-token' };

      supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-token', refresh_token: 'new-refresh-token' }
        },
        error: null
      });

      await refreshToken(req, res, next);

      expect(supabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token refreshed successfully',
        session: expect.any(Object)
      });
    });

    it('should handle missing refresh token', async () => {
      req.body = {};

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad request',
        message: 'Refresh token is required'
      });
    });

    it('should handle invalid refresh token', async () => {
      req.body = { refresh_token: 'invalid-token' };

      supabase.auth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid refresh token' }
      });

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token refresh failed',
        message: 'Invalid refresh token'
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      req.headers.authorization = 'Bearer test-token';

      supabase.auth.signOut.mockResolvedValue({ error: null });

      await logout(req, res, next);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });

    it('should handle logout without token', async () => {
      await logout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      req.user = { id: 'test-user-id' };

      const mockProfileData = {
        ...mockProfile,
        subscriptions: { tier: 'premium', status: 'active' },
        portfolio_stats: { total_value: 15000, win_rate: 0.65 }
      };

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfileData,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await getProfile(req, res, next);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        profile: mockProfileData
      });
    });

    it('should handle profile not found', async () => {
      req.user = { id: 'non-existent-id' };

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' }
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not found',
        message: 'Profile not found'
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      req.user = { id: 'test-user-id' };
      req.body = {
        name: 'Updated Name',
        investment_style: 'aggressive',
        risk_tolerance: 'high'
      };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      const updatedProfile = { ...mockProfile, ...req.body };
      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedProfile,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await updateProfile(req, res, next);

      expect(mockFromChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          investment_style: 'aggressive',
          risk_tolerance: 'high',
          updated_at: expect.any(String)
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    });

    it('should handle partial updates', async () => {
      req.user = { id: 'test-user-id' };
      req.body = { name: 'New Name Only' };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProfile, name: 'New Name Only' },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      await updateProfile(req, res, next);

      expect(mockFromChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name Only',
          updated_at: expect.any(String)
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      req.user = { email: 'test@example.com' };
      req.body = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      supabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await changePassword(req, res, next);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: req.user.email,
        password: req.body.current_password
      });

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: req.body.new_password
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password changed successfully'
      });
    });

    it('should reject incorrect current password', async () => {
      req.user = { email: 'test@example.com' };
      req.body = {
        current_password: 'wrongpassword',
        new_password: 'newpassword123'
      };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      });

      await changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      req.body = { email: 'test@example.com' };

      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => ({ isEmpty: () => true }))
      }));

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      process.env.FRONTEND_URL = 'https://example.com';

      await requestPasswordReset(req, res, next);

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'https://example.com/reset-password'
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password reset email sent'
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      req.body = { password: 'password123' };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const mockFromChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockFromChain);

      supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: null
      });

      await deleteAccount(req, res, next);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: req.user.email,
        password: req.body.password
      });

      expect(supabaseAdmin.from).toHaveBeenCalledWith('profiles');
      expect(mockFromChain.delete).toHaveBeenCalled();
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(req.user.id);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account deleted successfully'
      });
    });

    it('should reject deletion with incorrect password', async () => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      req.body = { password: 'wrongpassword' };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      });

      await deleteAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Password is incorrect'
      });
    });
  });

  describe('error handling', () => {
    it('should pass errors to next middleware', async () => {
      req.body = generateTestUser();
      
      jest.doMock('express-validator', () => ({
        validationResult: jest.fn(() => {
          throw new Error('Validation error');
        })
      }));

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Validation error');
    });
  });
});
import { jest } from '@jest/globals';

// Mock dependencies before importing the controller
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn()
  }
};

const mockSupabaseAdmin = {
  from: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
  })),
  auth: {
    admin: {
      deleteUser: jest.fn()
    }
  }
};

const mockValidationResult = jest.fn();
const mockLogger = {
  error: jest.fn(),
  info: jest.fn()
};

// Mock modules before importing
jest.unstable_mockModule('../src/config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabaseAdmin
}));

jest.unstable_mockModule('express-validator', () => ({
  validationResult: mockValidationResult
}));

jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import the controller after mocking
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  deleteAccount
} = await import('../src/controllers/authController.js');

describe('Auth Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
      user: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
    mockValidationResult.mockReturnValue({ isEmpty: () => true });
  });

  describe('register', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        investmentStyle: 'conservative'
      };
    });

    it('성공적으로 사용자를 등록해야 함', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', name: 'Test User' },
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await register(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
            investment_style: 'conservative'
          }
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Registration successful',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          investment_style: 'conservative'
        },
        session: mockSession
      });
    });

    it('유효성 검사 오류가 있을 때 400 에러를 반환해야 함', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'email', msg: 'Invalid email' }]
      });

      await register(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: [{ field: 'email', msg: 'Invalid email' }]
      });
    });

    it('Supabase 인증 오류가 있을 때 400 에러를 반환해야 함', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' }
      });

      await register(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Registration failed',
        message: 'Email already registered'
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('성공적으로 로그인해야 함', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      const mockProfile = { name: 'Test User', investment_style: 'conservative' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
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

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await login(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          ...mockProfile
        },
        session: mockSession
      });
    });

    it('잘못된 자격 증명으로 401 에러를 반환해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      await login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid login credentials'
      });
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      mockReq.body = {
        refresh_token: 'refresh_token_123'
      };
    });

    it('성공적으로 토큰을 갱신해야 함', async () => {
      const mockSession = { access_token: 'new_token123' };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'refresh_token_123'
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token refreshed successfully',
        session: mockSession
      });
    });

    it('refresh_token이 없을 때 400 에러를 반환해야 함', async () => {
      mockReq.body = {};

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad request',
        message: 'Refresh token is required'
      });
    });
  });

  describe('logout', () => {
    it('성공적으로 로그아웃해야 함', async () => {
      mockReq.headers = {
        authorization: 'Bearer token123'
      };

      mockSupabase.auth.signOut.mockResolvedValue({});

      await logout(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });

    it('토큰 없이도 로그아웃해야 함', async () => {
      await logout(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });
  });

  describe('getProfile', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user-123' };
    });

    it('성공적으로 프로필을 가져와야 함', async () => {
      const mockProfile = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      };

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await getProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        profile: mockProfile
      });
    });

    it('프로필을 찾을 수 없을 때 404 에러를 반환해야 함', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' }
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await getProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not found',
        message: 'Profile not found'
      });
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user-123' };
      mockReq.body = {
        name: 'Updated Name',
        investment_style: 'aggressive'
      };
    });

    it('성공적으로 프로필을 업데이트해야 함', async () => {
      const mockUpdatedProfile = {
        id: 'user-123',
        name: 'Updated Name',
        investment_style: 'aggressive'
      };

      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedProfile,
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await updateProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        profile: mockUpdatedProfile
      });
    });

    it('업데이트 실패 시 400 에러를 반환해야 함', async () => {
      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' }
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      await updateProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Update failed',
        message: 'Failed to update profile'
      });
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      mockReq.user = { email: 'test@example.com' };
      mockReq.body = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };
    });

    it('성공적으로 비밀번호를 변경해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: {} },
        error: null
      });

      mockSupabase.auth.updateUser.mockResolvedValue({
        data: {},
        error: null
      });

      await changePassword(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'oldpassword'
      });

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Password changed successfully'
      });
    });

    it('현재 비밀번호가 틀렸을 때 401 에러를 반환해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid password' }
      });

      await changePassword(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    });
  });

  describe('requestPasswordReset', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com'
      };
    });

    it('성공적으로 비밀번호 재설정 이메일을 보내야 함', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      await requestPasswordReset(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        }
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Password reset email sent'
      });
    });

    it('재설정 실패 시 400 에러를 반환해야 함', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email not found' }
      });

      await requestPasswordReset(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Reset failed',
        message: 'Email not found'
      });
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockReq.body = {
        password: 'password123'
      };
    });

    it('성공적으로 계정을 삭제해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: {} },
        error: null
      });

      const mockFromChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: {},
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null
      });

      await deleteAccount(mockReq, mockRes, mockNext);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account deleted successfully'
      });
    });

    it('비밀번호가 틀렸을 때 401 에러를 반환해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid password' }
      });

      await deleteAccount(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Password is incorrect'
      });
    });

    it('인증 사용자 삭제 실패 시 500 에러를 반환해야 함', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: {} },
        error: null
      });

      const mockFromChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: {},
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockFromChain);

      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' }
      });

      await deleteAccount(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Deletion failed',
        message: 'Failed to delete account'
      });
    });
  });

  describe('Error handling', () => {
    it('예외 발생 시 next를 호출해야 함', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Database error'));

      await register(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
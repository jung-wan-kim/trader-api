const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/auth.js');

// Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error', message: error.message });
});

describe('Authentication Integration Tests', () => {
  let testData;

  beforeEach(() => {
    testData = setupTestData();
    cleanupTestData();
  });

  afterEach(() => {
    cleanupTestData();
  });

  describe('POST /api/v1/auth/register', () => {
    it('사용자 등록에 성공해야 합니다', async () => {
      // Supabase mock 설정
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: testData.testUser.id,
            email: testData.testUser.email
          },
          session: { access_token: 'test-token' }
        },
        error: null
      });

      mockSupabase.supabaseAdmin.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testData.testUser,
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          investmentStyle: 'conservative'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.session).toHaveProperty('access_token');
    });

    it('잘못된 이메일 형식으로 등록 시 실패해야 합니다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
          investmentStyle: 'conservative'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('중복 이메일로 등록 시 실패해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' }
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
          investmentStyle: 'conservative'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('유효한 자격증명으로 로그인에 성공해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      
      // Supabase 로그인 mock
      mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: testData.testUser,
          session: { access_token: 'test-token', refresh_token: 'refresh-token' }
        },
        error: null
      });

      // 프로필 조회 mock
      mockSupabase.supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...testData.testUser, subscriptions: [] },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testData.testUser.email,
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toHaveProperty('email', testData.testUser.email);
      expect(response.body.session).toHaveProperty('access_token');
    });

    it('잘못된 비밀번호로 로그인 시 실패해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testData.testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication failed');
    });

    it('존재하지 않는 사용자로 로그인 시 실패해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication failed');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('유효한 리프레시 토큰으로 토큰 갱신에 성공해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: { 
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        },
        error: null
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: 'valid-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.session).toHaveProperty('access_token');
    });

    it('잘못된 리프레시 토큰으로 토큰 갱신 시 실패해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' }
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token refresh failed');
    });

    it('리프레시 토큰 없이 요청 시 실패해야 합니다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad request');
      expect(response.body.message).toBe('Refresh token is required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('로그아웃에 성공해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signOut.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('토큰 없이도 로그아웃에 성공해야 합니다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('유효한 이메일로 비밀번호 재설정 요청에 성공해야 합니다', async () => {
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testData.testUser.email
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('잘못된 이메일 형식으로 비밀번호 재설정 요청 시 실패해야 합니다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('너무 많은 요청 시 rate limit이 적용되어야 합니다', async () => {
      // Rate limiter는 middleware 테스트에서 별도로 테스트
      // 여기서는 기본적인 작동 확인만
      const mockSupabase = require('../../src/config/supabase.js');
      mockSupabase.supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      // 여러 번 요청을 보내도 429 상태 코드는 rate limiter에서 처리
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
        
        // Rate limit 전까지는 401이어야 함
        expect([401, 429]).toContain(response.status);
      }
    });
  });
});
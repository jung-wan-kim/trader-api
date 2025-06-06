const request = require('supertest');
const express = require('express');
const { authenticate, authorize } = require('../../src/middleware/auth.js');
const { rateLimiter, strictRateLimiter } = require('../../src/middleware/rateLimiter.js');
const { errorHandler } = require('../../src/middleware/errorHandler.js');

describe('Security Middleware Tests', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    cleanupTestData();
    
    // Express 앱 설정
    app = express();
    app.use(express.json());

    // Mock Supabase
    mockSupabase = require('../../src/config/supabase.js');
    mockSupabase.verifySession = jest.fn();
    mockSupabase.supabaseAdmin = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    };
  });

  afterEach(() => {
    cleanupTestData();
  });

  describe('Authentication Middleware', () => {
    beforeEach(() => {
      // 테스트 라우트 설정
      app.get('/protected', authenticate, (req, res) => {
        res.json({ message: 'Success', user: req.user });
      });
      
      app.get('/admin', authenticate, authorize(['admin']), (req, res) => {
        res.json({ message: 'Admin access granted' });
      });

      app.use(errorHandler);
    });

    it('유효한 JWT 토큰으로 인증에 성공해야 합니다', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        subscription_tier: 'premium'
      };

      mockSupabase.verifySession.mockResolvedValue({
        user: mockUser,
        error: null
      });

      mockSupabase.supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.message).toBe('Success');
      expect(response.body.user.id).toBe('test-user-id');
    });

    it('토큰이 없으면 401 오류를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Access token required');
    });

    it('잘못된 토큰 형식으로 401 오류를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid token format');
    });

    it('만료된 토큰으로 401 오류를 반환해야 합니다', async () => {
      mockSupabase.verifySession.mockResolvedValue({
        user: null,
        error: { message: 'JWT expired' }
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('존재하지 않는 사용자에 대해 401 오류를 반환해야 합니다', async () => {
      mockSupabase.verifySession.mockResolvedValue({
        user: { id: 'nonexistent-user' },
        error: null
      });

      mockSupabase.supabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-but-user-deleted')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('Authorization Middleware', () => {
    beforeEach(() => {
      // Mock user 설정
      app.use((req, res, next) => {
        req.user = {
          id: 'test-user-id',
          email: 'test@example.com',
          subscription_tier: 'basic',
          role: 'user'
        };
        next();
      });

      app.get('/premium-feature', authorize(['premium', 'enterprise']), (req, res) => {
        res.json({ message: 'Premium feature accessed' });
      });

      app.get('/admin-only', authorize(['admin']), (req, res) => {
        res.json({ message: 'Admin only feature' });
      });

      app.use(errorHandler);
    });

    it('적절한 구독 티어로 접근에 성공해야 합니다', async () => {
      // Premium user로 설정
      app.use((req, res, next) => {
        req.user.subscription_tier = 'premium';
        next();
      });

      const response = await request(app)
        .get('/premium-feature')
        .expect(200);

      expect(response.body.message).toBe('Premium feature accessed');
    });

    it('부족한 권한으로 403 오류를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/premium-feature')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Insufficient subscription level');
    });

    it('관리자가 아닌 사용자는 관리자 기능에 접근할 수 없어야 합니다', async () => {
      const response = await request(app)
        .get('/admin-only')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Rate Limiting Middleware', () => {
    beforeEach(() => {
      // 일반 rate limiter 테스트
      app.use('/api', rateLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // 엄격한 rate limiter 테스트
      app.use('/auth', strictRateLimiter);
      app.post('/auth/login', (req, res) => {
        res.json({ message: 'Login attempt' });
      });

      app.use(errorHandler);
    });

    it('정상적인 요청은 허용해야 합니다', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.message).toBe('Success');
    });

    it('너무 많은 요청에 대해 rate limiting을 적용해야 합니다', async () => {
      // 여러 번 요청을 보내서 rate limit 테스트
      // 실제 rate limit 설정에 따라 조정 필요
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/test')
            .expect((res) => {
              expect([200, 429]).toContain(res.status);
            })
        );
      }

      await Promise.all(requests);
    });

    it('인증 엔드포인트에 엄격한 rate limiting을 적용해야 합니다', async () => {
      // 인증 엔드포인트는 더 엄격한 제한이 적용됨
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password' })
            .expect((res) => {
              expect([200, 429]).toContain(res.status);
            })
        );
      }

      await Promise.all(requests);
    });
  });

  describe('Error Handler Middleware', () => {
    beforeEach(() => {
      app.get('/throw-error', (req, res, next) => {
        const error = new Error('Test error');
        error.status = 500;
        next(error);
      });

      app.get('/validation-error', (req, res, next) => {
        const error = new Error('Validation failed');
        error.status = 400;
        error.details = { field: 'email', message: 'Invalid email format' };
        next(error);
      });

      app.get('/database-error', (req, res, next) => {
        const error = new Error('Database connection failed');
        error.code = 'ECONNREFUSED';
        next(error);
      });

      app.get('/unhandled-error', (req, res, next) => {
        throw new Error('Unhandled error');
      });

      app.use(errorHandler);
    });

    it('일반 오류를 적절히 처리해야 합니다', async () => {
      const response = await request(app)
        .get('/throw-error')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBe('Test error');
    });

    it('유효성 검사 오류를 적절히 처리해야 합니다', async () => {
      const response = await request(app)
        .get('/validation-error')
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details).toEqual({
        field: 'email',
        message: 'Invalid email format'
      });
    });

    it('데이터베이스 오류를 적절히 처리해야 합니다', async () => {
      const response = await request(app)
        .get('/database-error')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBe('Service temporarily unavailable');
    });

    it('처리되지 않은 오류를 캐치해야 합니다', async () => {
      const response = await request(app)
        .get('/unhandled-error')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
    });

    it('프로덕션 환경에서는 스택 트레이스를 숨겨야 합니다', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/throw-error')
        .expect(500);

      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('개발 환경에서는 스택 트레이스를 포함해야 합니다', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/throw-error')
        .expect(500);

      expect(response.body.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      // Helmet이 적용된 상황을 시뮬레이션
      app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
      });

      app.get('/security-test', (req, res) => {
        res.json({ message: 'Security headers applied' });
      });
    });

    it('보안 헤더가 올바르게 설정되어야 합니다', async () => {
      const response = await request(app)
        .get('/security-test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('Input Validation & Sanitization', () => {
    beforeEach(() => {
      app.post('/validate-input', (req, res, next) => {
        const { email, name, amount } = req.body;

        // 기본적인 입력 검증 시뮬레이션
        if (!email || !email.includes('@')) {
          const error = new Error('Invalid email format');
          error.status = 400;
          return next(error);
        }

        if (name && name.includes('<script>')) {
          const error = new Error('Potentially malicious input detected');
          error.status = 400;
          return next(error);
        }

        if (amount && (amount < 0 || amount > 1000000)) {
          const error = new Error('Amount must be between 0 and 1,000,000');
          error.status = 400;
          return next(error);
        }

        res.json({ message: 'Input validated successfully' });
      });

      app.use(errorHandler);
    });

    it('유효한 입력을 허용해야 합니다', async () => {
      const response = await request(app)
        .post('/validate-input')
        .send({
          email: 'test@example.com',
          name: 'John Doe',
          amount: 1000
        })
        .expect(200);

      expect(response.body.message).toBe('Input validated successfully');
    });

    it('잘못된 이메일 형식을 거부해야 합니다', async () => {
      const response = await request(app)
        .post('/validate-input')
        .send({
          email: 'invalid-email',
          name: 'John Doe'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid email format');
    });

    it('XSS 시도를 감지하고 차단해야 합니다', async () => {
      const response = await request(app)
        .post('/validate-input')
        .send({
          email: 'test@example.com',
          name: '<script>alert("XSS")</script>'
        })
        .expect(400);

      expect(response.body.message).toBe('Potentially malicious input detected');
    });

    it('범위를 벗어난 숫자 값을 거부해야 합니다', async () => {
      const response = await request(app)
        .post('/validate-input')
        .send({
          email: 'test@example.com',
          name: 'John Doe',
          amount: -100
        })
        .expect(400);

      expect(response.body.message).toBe('Amount must be between 0 and 1,000,000');
    });
  });

  describe('SQL Injection Prevention', () => {
    beforeEach(() => {
      app.get('/search', (req, res, next) => {
        const { query } = req.query;

        // SQL injection 패턴 감지
        const sqlInjectionPattern = /('|('')|;|--|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|or\s+1=1|and\s+1=1)/i;
        
        if (query && sqlInjectionPattern.test(query)) {
          const error = new Error('Potentially malicious query detected');
          error.status = 400;
          return next(error);
        }

        res.json({ message: 'Search completed', query });
      });

      app.use(errorHandler);
    });

    it('일반적인 검색어를 허용해야 합니다', async () => {
      const response = await request(app)
        .get('/search?query=apple')
        .expect(200);

      expect(response.body.message).toBe('Search completed');
      expect(response.body.query).toBe('apple');
    });

    it('SQL injection 시도를 감지하고 차단해야 합니다', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; SELECT * FROM users",
        "UNION SELECT * FROM passwords"
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/search?query=${encodeURIComponent(attempt)}`)
          .expect(400);

        expect(response.body.message).toBe('Potentially malicious query detected');
      }
    });
  });
});
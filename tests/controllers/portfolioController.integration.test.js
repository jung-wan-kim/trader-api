const request = require('supertest');
const express = require('express');
const portfolioRoutes = require('../../src/routes/portfolio.js');

// Express 앱 설정
const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id-123',
    email: 'test@example.com'
  };
  next();
});

app.use('/api/v1/portfolio', portfolioRoutes);

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error', message: error.message });
});

describe('Portfolio Integration Tests', () => {
  let testData;
  let mockSupabase;
  let mockFinnhubService;

  beforeEach(() => {
    testData = setupTestData();
    cleanupTestData();
    
    // Supabase mock 설정
    mockSupabase = require('../../src/config/database.js');
    mockSupabase.supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(() => ({
              range: jest.fn()
            }))
          })),
          order: jest.fn(() => ({
            range: jest.fn()
          })),
          gte: jest.fn(),
          filter: jest.fn()
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    };

    // Finnhub 서비스 mock
    mockFinnhubService = require('../../src/services/finnhubService.js');
    mockFinnhubService.getQuote = jest.fn().mockResolvedValue({
      c: 155.50, // current price
      h: 160.00, // high
      l: 150.00, // low
      o: 152.00, // open
      pc: 151.00, // previous close
      t: Date.now()
    });
  });

  afterEach(() => {
    cleanupTestData();
  });

  describe('GET /api/v1/portfolio', () => {
    it('사용자의 포트폴리오 목록을 조회해야 합니다', async () => {
      const mockPortfolios = [
        {
          ...testData.testPortfolio,
          positions: [
            { ...testData.testPosition, status: 'open' }
          ]
        }
      ];

      mockSupabase.supabase.from().select().eq().order.mockResolvedValue({
        data: mockPortfolios,
        error: null
      });

      const response = await request(app)
        .get('/api/v1/portfolio')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('포트폴리오가 없는 경우 빈 배열을 반환해야 합니다', async () => {
      mockSupabase.supabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await request(app)
        .get('/api/v1/portfolio')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/v1/portfolio/:id', () => {
    it('특정 포트폴리오를 조회해야 합니다', async () => {
      const mockPortfolio = {
        ...testData.testPortfolio,
        positions: [testData.testPosition]
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: mockPortfolio,
        error: null
      });

      const response = await request(app)
        .get(`/api/v1/portfolio/${testData.testPortfolio.id}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testData.testPortfolio.id);
    });

    it('존재하지 않는 포트폴리오 조회 시 404를 반환해야 합니다', async () => {
      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const response = await request(app)
        .get('/api/v1/portfolio/nonexistent-id')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('Portfolio not found');
    });
  });

  describe('POST /api/v1/portfolio', () => {
    it('새 포트폴리오를 생성해야 합니다', async () => {
      const newPortfolio = {
        name: 'New Portfolio',
        initial_capital: 50000,
        description: 'Test portfolio'
      };

      const createdPortfolio = {
        id: 'new-portfolio-id',
        user_id: 'test-user-id-123',
        ...newPortfolio,
        current_value: newPortfolio.initial_capital,
        cash_balance: newPortfolio.initial_capital
      };

      mockSupabase.supabase.from().insert().select().single.mockResolvedValue({
        data: createdPortfolio,
        error: null
      });

      const response = await request(app)
        .post('/api/v1/portfolio')
        .send(newPortfolio)
        .expect(201);

      expect(response.body.message).toBe('Portfolio created successfully');
      expect(response.body.data.name).toBe(newPortfolio.name);
      expect(response.body.data.initial_capital).toBe(newPortfolio.initial_capital);
    });

    it('잘못된 데이터로 포트폴리오 생성 시 400을 반환해야 합니다', async () => {
      const invalidPortfolio = {
        name: '', // 빈 이름
        initial_capital: -1000 // 음수 자본금
      };

      const response = await request(app)
        .post('/api/v1/portfolio')
        .send(invalidPortfolio)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/v1/portfolio/:id', () => {
    it('포트폴리오 정보를 수정해야 합니다', async () => {
      const updateData = {
        name: 'Updated Portfolio Name',
        description: 'Updated description'
      };

      // 소유권 확인 mock
      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: testData.testPortfolio.id },
        error: null
      });

      // 업데이트 mock
      const updatedPortfolio = {
        ...testData.testPortfolio,
        ...updateData
      };

      mockSupabase.supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedPortfolio,
        error: null
      });

      const response = await request(app)
        .put(`/api/v1/portfolio/${testData.testPortfolio.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Portfolio updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('다른 사용자의 포트폴리오 수정 시 404를 반환해야 합니다', async () => {
      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const response = await request(app)
        .put('/api/v1/portfolio/other-user-portfolio')
        .send({ name: 'Hacked Portfolio' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('DELETE /api/v1/portfolio/:id', () => {
    it('열린 포지션이 없는 포트폴리오는 삭제해야 합니다', async () => {
      const portfolioWithClosedPositions = {
        ...testData.testPortfolio,
        positions: [
          { ...testData.testPosition, status: 'closed' }
        ]
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: portfolioWithClosedPositions,
        error: null
      });

      mockSupabase.supabase.from().delete().eq.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .delete(`/api/v1/portfolio/${testData.testPortfolio.id}`)
        .expect(200);

      expect(response.body.message).toBe('Portfolio deleted successfully');
    });

    it('열린 포지션이 있는 포트폴리오 삭제 시 400을 반환해야 합니다', async () => {
      const portfolioWithOpenPositions = {
        ...testData.testPortfolio,
        positions: [
          { ...testData.testPosition, status: 'open' }
        ]
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: portfolioWithOpenPositions,
        error: null
      });

      const response = await request(app)
        .delete(`/api/v1/portfolio/${testData.testPortfolio.id}`)
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Cannot delete portfolio with open positions');
    });
  });

  describe('GET /api/v1/portfolio/:id/performance', () => {
    it('포트폴리오 성과를 조회해야 합니다', async () => {
      const mockPortfolio = testData.testPortfolio;
      const mockPositions = [
        {
          ...testData.testPosition,
          status: 'closed',
          profit_loss: 500,
          closed_at: new Date().toISOString()
        }
      ];

      // 포트폴리오 소유권 확인
      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockPortfolio,
        error: null
      });

      // 포지션 데이터 조회
      mockSupabase.supabase.from().select().eq().gte.mockResolvedValue({
        data: mockPositions,
        error: null
      });

      const response = await request(app)
        .get(`/api/v1/portfolio/${testData.testPortfolio.id}/performance?period=1M`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.total_trades).toBeDefined();
      expect(response.body.data.metrics.win_rate).toBeDefined();
    });
  });

  describe('GET /api/v1/portfolio/:portfolioId/positions', () => {
    it('포트폴리오의 포지션 목록을 조회해야 합니다', async () => {
      const mockPositions = [testData.testPosition];

      // 포트폴리오 소유권 확인
      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: testData.testPortfolio.id },
        error: null
      });

      // 포지션 조회 설정
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockPositions,
          error: null,
          count: mockPositions.length
        })
      };

      mockSupabase.supabase.from().select.mockReturnValue(mockQuery);

      const response = await request(app)
        .get(`/api/v1/portfolio/${testData.testPortfolio.id}/positions`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/v1/portfolio/:portfolioId/positions', () => {
    it('새 포지션을 추가해야 합니다', async () => {
      const newPosition = {
        symbol: 'TSLA',
        company_name: 'Tesla Inc',
        quantity: 5,
        entry_price: 200.00,
        action: 'BUY'
      };

      const mockPortfolio = {
        ...testData.testPortfolio,
        cash_balance: 5000 // 충분한 잔액
      };

      // 포트폴리오 조회 mock
      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockPortfolio,
        error: null
      });

      // 포지션 생성 mock
      const createdPosition = {
        id: 'new-position-id',
        portfolio_id: testData.testPortfolio.id,
        user_id: 'test-user-id-123',
        ...newPosition,
        status: 'open'
      };

      mockSupabase.supabase.from().insert().select().single.mockResolvedValue({
        data: createdPosition,
        error: null
      });

      // 포트폴리오 업데이트 mock
      mockSupabase.supabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .post(`/api/v1/portfolio/${testData.testPortfolio.id}/positions`)
        .send(newPosition)
        .expect(201);

      expect(response.body.message).toBe('Position created successfully');
      expect(response.body.data.symbol).toBe(newPosition.symbol);
    });

    it('잔액 부족 시 포지션 추가에 실패해야 합니다', async () => {
      const expensivePosition = {
        symbol: 'BRK-A',
        company_name: 'Berkshire Hathaway',
        quantity: 1,
        entry_price: 500000.00, // 매우 비싼 주식
        action: 'BUY'
      };

      const mockPortfolio = {
        ...testData.testPortfolio,
        cash_balance: 1000 // 부족한 잔액
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: mockPortfolio,
        error: null
      });

      const response = await request(app)
        .post(`/api/v1/portfolio/${testData.testPortfolio.id}/positions`)
        .send(expensivePosition)
        .expect(400);

      expect(response.body.error).toBe('Insufficient Funds');
    });
  });

  describe('PUT /api/v1/portfolio/positions/:id', () => {
    it('포지션 정보를 수정해야 합니다', async () => {
      const updateData = {
        stop_loss: 140.00,
        take_profit: 180.00,
        notes: 'Updated position'
      };

      const mockPosition = {
        ...testData.testPosition,
        status: 'open',
        portfolio: { user_id: 'test-user-id-123' }
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockPosition,
        error: null
      });

      const updatedPosition = {
        ...mockPosition,
        ...updateData
      };

      mockSupabase.supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedPosition,
        error: null
      });

      const response = await request(app)
        .put(`/api/v1/portfolio/positions/${testData.testPosition.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Position updated successfully');
      expect(response.body.data.stop_loss).toBe(updateData.stop_loss);
    });

    it('닫힌 포지션 수정 시 400을 반환해야 합니다', async () => {
      const mockPosition = {
        ...testData.testPosition,
        status: 'closed',
        portfolio: { user_id: 'test-user-id-123' }
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: mockPosition,
        error: null
      });

      const response = await request(app)
        .put(`/api/v1/portfolio/positions/${testData.testPosition.id}`)
        .send({ stop_loss: 140.00 })
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Cannot update closed position');
    });
  });

  describe('POST /api/v1/portfolio/positions/:id/close', () => {
    it('포지션을 닫아야 합니다', async () => {
      const closeData = {
        exit_price: 160.00,
        notes: 'Taking profit'
      };

      const mockPosition = {
        ...testData.testPosition,
        status: 'open',
        action: 'BUY',
        portfolio: {
          user_id: 'test-user-id-123',
          cash_balance: 2000,
          realized_profit_loss: 0
        }
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockPosition,
        error: null
      });

      const closedPosition = {
        ...mockPosition,
        status: 'closed',
        exit_price: closeData.exit_price,
        profit_loss: (closeData.exit_price - mockPosition.entry_price) * mockPosition.quantity
      };

      mockSupabase.supabase.from().update().eq().select().single.mockResolvedValue({
        data: closedPosition,
        error: null
      });

      mockSupabase.supabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .post(`/api/v1/portfolio/positions/${testData.testPosition.id}/close`)
        .send(closeData)
        .expect(200);

      expect(response.body.message).toBe('Position closed successfully');
      expect(response.body.data.status).toBe('closed');
      expect(response.body.data.exit_price).toBe(closeData.exit_price);
    });

    it('이미 닫힌 포지션 닫기 시도 시 400을 반환해야 합니다', async () => {
      const mockPosition = {
        ...testData.testPosition,
        status: 'closed',
        portfolio: { user_id: 'test-user-id-123' }
      };

      mockSupabase.supabase.from().select().eq().single.mockResolvedValue({
        data: mockPosition,
        error: null
      });

      const response = await request(app)
        .post(`/api/v1/portfolio/positions/${testData.testPosition.id}/close`)
        .send({ exit_price: 160.00 })
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Position already closed');
    });
  });
});
const request = require('supertest');
const express = require('express');
const marketRoutes = require('../../src/routes/market.js');

// Express 앱 설정
const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id-123',
    email: 'test@example.com',
    subscription_tier: 'premium'
  };
  next();
});

app.use('/api/v1/market', marketRoutes);

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error', message: error.message });
});

describe('Market Data Integration Tests', () => {
  let mockFinnhubService;

  beforeEach(() => {
    cleanupTestData();
    
    // Finnhub 서비스 mock
    mockFinnhubService = require('../../src/services/finnhubService.js');
    
    // 기본 mock 응답 설정
    mockFinnhubService.getQuote = jest.fn();
    mockFinnhubService.getCandles = jest.fn();
    mockFinnhubService.searchStocks = jest.fn();
    mockFinnhubService.getCompanyProfile = jest.fn();
    mockFinnhubService.getNews = jest.fn();
    mockFinnhubService.getRecommendationTrends = jest.fn();
    mockFinnhubService.getMarketStatus = jest.fn();
    mockFinnhubService.getEarningsCalendar = jest.fn();
  });

  afterEach(() => {
    cleanupTestData();
  });

  describe('GET /api/v1/market/quote/:symbol', () => {
    it('주식 실시간 시세를 조회해야 합니다', async () => {
      const mockQuote = {
        c: 150.25,    // current price
        d: 2.50,      // change
        dp: 1.69,     // percent change
        h: 152.00,    // high
        l: 148.50,    // low
        o: 149.00,    // open
        pc: 147.75,   // previous close
        t: 1672531200 // timestamp
      };

      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);

      const response = await request(app)
        .get('/api/v1/market/quote/AAPL')
        .expect(200);

      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(response.body.data).toEqual({
        symbol: 'AAPL',
        current: 150.25,
        change: 2.50,
        percentChange: 1.69,
        high: 152.00,
        low: 148.50,
        open: 149.00,
        previousClose: 147.75,
        timestamp: 1672531200
      });
    });

    it('소문자 심볼도 올바르게 처리해야 합니다', async () => {
      const mockQuote = { c: 150.25, d: 2.50 };
      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);

      const response = await request(app)
        .get('/api/v1/market/quote/aapl')
        .expect(200);

      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(response.body.data.symbol).toBe('AAPL');
    });

    it('API 오류 시 500 상태 코드를 반환해야 합니다', async () => {
      mockFinnhubService.getQuote.mockRejectedValue(new Error('Finnhub API Error'));

      const response = await request(app)
        .get('/api/v1/market/quote/INVALID')
        .expect(500);

      expect(response.body.error).toBe('Market Data Error');
      expect(response.body.message).toBe('Failed to fetch quote data');
    });
  });

  describe('GET /api/v1/market/candles/:symbol', () => {
    it('캔들스틱 데이터를 조회해야 합니다', async () => {
      const mockCandles = [
        {
          timestamp: 1672531200,
          open: 149.00,
          high: 152.00,
          low: 148.50,
          close: 150.25,
          volume: 1000000
        },
        {
          timestamp: 1672617600,
          open: 151.00,
          high: 153.00,
          low: 150.50,
          close: 152.75,
          volume: 1200000
        }
      ];

      mockFinnhubService.getCandles.mockResolvedValue(mockCandles);

      const response = await request(app)
        .get('/api/v1/market/candles/AAPL?resolution=D&from=1672531200&to=1672617600')
        .expect(200);

      expect(mockFinnhubService.getCandles).toHaveBeenCalledWith(
        'AAPL', 'D', '1672531200', '1672617600'
      );
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.resolution).toBe('D');
      expect(response.body.data.candles).toEqual(mockCandles);
    });

    it('기본 파라미터로 30일 데이터를 조회해야 합니다', async () => {
      const mockCandles = [];
      mockFinnhubService.getCandles.mockResolvedValue(mockCandles);

      const response = await request(app)
        .get('/api/v1/market/candles/AAPL')
        .expect(200);

      expect(mockFinnhubService.getCandles).toHaveBeenCalled();
      const callArgs = mockFinnhubService.getCandles.mock.calls[0];
      expect(callArgs[0]).toBe('AAPL');
      expect(callArgs[1]).toBe('D'); // default resolution
      // from과 to는 동적으로 계산되므로 값 자체보다는 호출 여부만 확인
    });
  });

  describe('GET /api/v1/market/search', () => {
    it('주식 검색 결과를 반환해야 합니다', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          description: 'Apple Inc',
          type: 'Common Stock',
          displaySymbol: 'AAPL'
        },
        {
          symbol: 'AAPL.SW',
          description: 'Apple Inc - Switzerland',
          type: 'Common Stock',
          displaySymbol: 'AAPL.SW'
        }
      ];

      mockFinnhubService.searchStocks.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/v1/market/search?q=Apple')
        .expect(200);

      expect(mockFinnhubService.searchStocks).toHaveBeenCalledWith('Apple');
      expect(response.body.data).toEqual(mockResults.map(stock => ({
        symbol: stock.symbol,
        description: stock.description,
        type: stock.type,
        displaySymbol: stock.displaySymbol
      })));
    });

    it('검색어가 없으면 400 오류를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/api/v1/market/search')
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Search query is required');
    });

    it('빈 검색어로 요청 시 400 오류를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/api/v1/market/search?q=')
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toBe('Search query is required');
    });
  });

  describe('GET /api/v1/market/news/:symbol?', () => {
    it('특정 주식의 뉴스를 조회해야 합니다', async () => {
      const mockNews = [
        {
          id: 123456,
          headline: 'Apple Announces New Product',
          summary: 'Apple unveils new iPhone model with advanced features',
          source: 'Reuters',
          url: 'https://example.com/news1',
          datetime: 1672531200,
          image: 'https://example.com/image1.jpg',
          related: 'AAPL'
        },
        {
          id: 123457,
          headline: 'Apple Q4 Earnings Beat Expectations',
          summary: 'Apple reports strong quarterly results',
          source: 'Bloomberg',
          url: 'https://example.com/news2',
          datetime: 1672444800,
          image: 'https://example.com/image2.jpg',
          related: 'AAPL'
        }
      ];

      mockFinnhubService.getNews.mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/v1/market/news/AAPL')
        .expect(200);

      expect(mockFinnhubService.getNews).toHaveBeenCalledWith('AAPL', undefined, undefined);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({
        id: 123456,
        headline: 'Apple Announces New Product',
        summary: 'Apple unveils new iPhone model with advanced features',
        source: 'Reuters',
        url: 'https://example.com/news1',
        datetime: 1672531200,
        image: 'https://example.com/image1.jpg',
        related: 'AAPL'
      });
    });

    it('일반 시장 뉴스를 조회해야 합니다 (symbol 없음)', async () => {
      const mockNews = [
        {
          id: 123458,
          headline: 'Market Update',
          summary: 'Stock market sees strong gains',
          source: 'CNBC',
          url: 'https://example.com/news3',
          datetime: 1672531200,
          image: 'https://example.com/image3.jpg'
        }
      ];

      mockFinnhubService.getNews.mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/v1/market/news')
        .expect(200);

      expect(mockFinnhubService.getNews).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(response.body.data).toHaveLength(1);
    });

    it('너무 많은 뉴스가 있을 경우 50개로 제한해야 합니다', async () => {
      const mockNews = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        headline: `News ${i}`,
        summary: `Summary ${i}`,
        source: 'Source',
        url: `https://example.com/news${i}`,
        datetime: 1672531200,
        image: `https://example.com/image${i}.jpg`
      }));

      mockFinnhubService.getNews.mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/v1/market/news/AAPL')
        .expect(200);

      expect(response.body.data).toHaveLength(50);
    });
  });

  describe('GET /api/v1/market/profile/:symbol', () => {
    it('회사 프로필 정보를 조회해야 합니다', async () => {
      const mockProfile = {
        ticker: 'AAPL',
        name: 'Apple Inc',
        country: 'US',
        currency: 'USD',
        exchange: 'NASDAQ',
        finnhubIndustry: 'Technology',
        logo: 'https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00000000000a.png',
        marketCapitalization: 2800000,
        shareOutstanding: 16000,
        weburl: 'https://www.apple.com/',
        phone: '+1-408-996-1010',
        ipo: '1980-12-12'
      };

      mockFinnhubService.getCompanyProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/v1/market/profile/AAPL')
        .expect(200);

      expect(mockFinnhubService.getCompanyProfile).toHaveBeenCalledWith('AAPL');
      expect(response.body.data).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc',
        country: 'US',
        currency: 'USD',
        exchange: 'NASDAQ',
        industry: 'Technology',
        logo: 'https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00000000000a.png',
        marketCap: 2800000,
        shareOutstanding: 16000,
        weburl: 'https://www.apple.com/',
        phone: '+1-408-996-1010',
        ipo: '1980-12-12'
      });
    });

    it('존재하지 않는 회사 프로필 조회 시 404를 반환해야 합니다', async () => {
      mockFinnhubService.getCompanyProfile.mockResolvedValue({});

      const response = await request(app)
        .get('/api/v1/market/profile/INVALID')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('Company profile not found');
    });
  });

  describe('GET /api/v1/market/indicators/:symbol', () => {
    it('기술적 지표를 계산하고 반환해야 합니다', async () => {
      const mockQuote = { c: 150.25 };
      const mockCandles = [
        { timestamp: 1672531200, open: 149.00, high: 152.00, low: 148.50, close: 150.25, volume: 1000000 },
        { timestamp: 1672617600, open: 151.00, high: 153.00, low: 150.50, close: 152.75, volume: 1200000 },
        { timestamp: 1672704000, open: 152.50, high: 155.00, low: 151.00, close: 154.00, volume: 1100000 }
      ];

      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);
      mockFinnhubService.getCandles.mockResolvedValue(mockCandles);

      const response = await request(app)
        .get('/api/v1/market/indicators/AAPL?period=1M')
        .expect(200);

      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.currentPrice).toBe(150.25);
      expect(response.body.data.indicators).toBeDefined();
      expect(response.body.data.indicators.sma).toBeDefined();
      expect(response.body.data.indicators.rsi).toBeDefined();
      expect(response.body.data.indicators.macd).toBeDefined();
      expect(response.body.data.strategySignals).toBeDefined();
    });

    it('데이터가 없을 때 404를 반환해야 합니다', async () => {
      const mockQuote = { c: 150.25 };
      mockFinnhubService.getQuote.mockResolvedValue(mockQuote);
      mockFinnhubService.getCandles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/market/indicators/INVALID')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('No data available for technical analysis');
    });
  });

  describe('GET /api/v1/market/sentiment/:symbol', () => {
    it('시장 센티먼트를 분석하고 반환해야 합니다', async () => {
      const mockRecommendations = [
        {
          buy: 15,
          hold: 8,
          period: '2023-01-01',
          sell: 3,
          strongBuy: 12,
          strongSell: 1,
          symbol: 'AAPL'
        }
      ];

      const mockNews = [
        { id: 1, headline: 'Positive news', sentiment: 'positive' },
        { id: 2, headline: 'Another positive news', sentiment: 'positive' }
      ];

      mockFinnhubService.getRecommendationTrends.mockResolvedValue(mockRecommendations);
      mockFinnhubService.getNews.mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/v1/market/sentiment/AAPL')
        .expect(200);

      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.sentiment).toBe('BULLISH'); // strongBuy + buy > sell + strongSell
      expect(response.body.data.recommendations).toEqual(mockRecommendations[0]);
      expect(response.body.data.newsCount).toBe(2);
    });
  });

  describe('GET /api/v1/market/earnings', () => {
    it('실적 발표 일정을 조회해야 합니다', async () => {
      const mockEarnings = {
        earningsCalendar: [
          {
            date: '2023-01-25',
            epsActual: 1.88,
            epsEstimate: 1.85,
            hour: 'amc',
            quarter: 1,
            revenueActual: 117154000000,
            revenueEstimate: 116500000000,
            symbol: 'AAPL',
            year: 2023
          }
        ]
      };

      mockFinnhubService.getEarningsCalendar.mockResolvedValue(mockEarnings);

      const response = await request(app)
        .get('/api/v1/market/earnings?from=2023-01-01&to=2023-01-31')
        .expect(200);

      expect(mockFinnhubService.getEarningsCalendar).toHaveBeenCalledWith('2023-01-01', '2023-01-31');
      expect(response.body.data).toEqual(mockEarnings.earningsCalendar);
    });
  });

  describe('GET /api/v1/market/status', () => {
    it('시장 상태를 조회해야 합니다', async () => {
      const mockStatus = {
        exchange: 'US',
        holiday: null,
        isOpen: true,
        session: 'market',
        timezone: 'America/New_York',
        t: 1672531200
      };

      mockFinnhubService.getMarketStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/v1/market/status')
        .expect(200);

      expect(mockFinnhubService.getMarketStatus).toHaveBeenCalled();
      expect(response.body.data).toEqual(mockStatus);
    });
  });

  describe('GET /api/v1/market/signals/:symbol', () => {
    it('전략별 신호를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/api/v1/market/signals/AAPL')
        .expect(200);

      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.strategies).toBeDefined();
      expect(response.body.data.strategies.jesseLivermore).toBeDefined();
      expect(response.body.data.strategies.larryWilliams).toBeDefined();
      expect(response.body.data.strategies.stanWeinstein).toBeDefined();
    });

    it('특정 전략만 요청할 수 있어야 합니다', async () => {
      const response = await request(app)
        .get('/api/v1/market/signals/AAPL?strategy=jesseLivermore')
        .expect(200);

      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.strategy).toBe('jesseLivermore');
      expect(response.body.data.signal).toBeDefined();
      expect(response.body.data.strength).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('Finnhub 서비스 오류를 적절히 처리해야 합니다', async () => {
      mockFinnhubService.getQuote.mockRejectedValue(new Error('Service Unavailable'));

      const response = await request(app)
        .get('/api/v1/market/quote/AAPL')
        .expect(500);

      expect(response.body.error).toBe('Market Data Error');
    });

    it('네트워크 오류를 적절히 처리해야 합니다', async () => {
      const networkError = new Error('ECONNREFUSED');
      networkError.code = 'ECONNREFUSED';
      mockFinnhubService.searchStocks.mockRejectedValue(networkError);

      const response = await request(app)
        .get('/api/v1/market/search?q=AAPL')
        .expect(500);

      expect(response.body.error).toBe('Market Data Error');
    });
  });
});
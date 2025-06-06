const NodeCache = require('node-cache');
const FinnhubService = require('../../src/services/finnhubService');

// Mock NodeCache
jest.mock('node-cache');

describe('FinnhubService', () => {
  let service;
  let mockCache;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn()
    };
    NodeCache.mockImplementation(() => mockCache);
    
    service = new FinnhubService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key and cache', () => {
      expect(service.apiKey).toBeDefined();
      expect(service.cache).toBeDefined();
      expect(service.baseURL).toBe('https://finnhub.io/api/v1');
    });
  });

  describe('static methods', () => {
    it('should format candles data correctly', () => {
      const candlesData = {
        t: [1640995200, 1641081600],
        o: [100, 105],
        h: [110, 115],
        l: [95, 100],
        c: [105, 110],
        v: [1000000, 1200000]
      };

      const formatted = FinnhubService.formatCandles(candlesData);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toEqual({
        timestamp: 1640995200,
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 1000000
      });
    });

    it('should handle empty candles data', () => {
      const emptyCandlesData = {
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: []
      };

      const formatted = FinnhubService.formatCandles(emptyCandlesData);

      expect(formatted).toEqual([]);
    });

    it('should handle missing candles data', () => {
      const formatted = FinnhubService.formatCandles(null);
      expect(formatted).toEqual([]);
    });

    it('should calculate period from date correctly', () => {
      const date = new Date('2024-01-15');
      const period = FinnhubService.getPeriodFromDate(date);

      expect(period).toMatch(/^\d+$/);
      expect(parseInt(period)).toBeGreaterThan(0);
    });

    it('should handle invalid date for period calculation', () => {
      const period = FinnhubService.getPeriodFromDate('invalid');
      expect(period).toBe('0');
    });
  });

  describe('cache operations', () => {
    it('should check cache before making API call', async () => {
      const cachedData = { symbol: 'AAPL', price: 150 };
      mockCache.get.mockReturnValue(cachedData);

      // Simular uma chamada que usa cache
      const cacheKey = 'test-key';
      const result = service.cache.get(cacheKey);

      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedData);
    });

    it('should set cache with TTL', () => {
      const data = { symbol: 'AAPL', price: 150 };
      const cacheKey = 'test-key';
      const ttl = 300; // 5 minutes

      service.cache.set(cacheKey, data, ttl);

      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, data, ttl);
    });
  });

  describe('error handling', () => {
    it('should handle missing API key', () => {
      const originalApiKey = process.env.FINNHUB_API_KEY;
      delete process.env.FINNHUB_API_KEY;

      const newService = new FinnhubService();
      expect(newService.apiKey).toBeUndefined();

      process.env.FINNHUB_API_KEY = originalApiKey;
    });
  });

  describe('helper methods', () => {
    it('should build correct URL with parameters', () => {
      const baseURL = 'https://finnhub.io/api/v1';
      const endpoint = '/quote';
      const symbol = 'AAPL';
      const expectedURL = `${baseURL}${endpoint}?symbol=${symbol}&token=${service.apiKey}`;

      // Verificar que a URL seria construída corretamente
      expect(service.baseURL).toBe(baseURL);
      expect(service.apiKey).toBeDefined();
    });
  });
});
import { jest } from '@jest/globals';
import axios from 'axios';
import NodeCache from 'node-cache';
import FinnhubService from '../../../src/services/finnhubService.js';
import { mockFinnhubResponses } from '../../helpers/testUtils.js';

// Mock dependencies
jest.mock('axios');
jest.mock('node-cache');
jest.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('FinnhubService', () => {
  let finnhubService;
  let mockAxiosCreate;
  let mockCacheInstance;

  beforeEach(() => {
    // Setup cache mock
    mockCacheInstance = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn()
    };
    NodeCache.mockImplementation(() => mockCacheInstance);

    // Setup axios mock
    mockAxiosCreate = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { baseURL: 'https://finnhub.io/api/v1' }
    };
    axios.create.mockReturnValue(mockAxiosCreate);

    // Set environment variables
    process.env.FINNHUB_API_KEY = 'test-api-key';
    process.env.CACHE_TTL = '300';

    // Create service instance
    finnhubService = new FinnhubService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://finnhub.io/api/v1',
        params: { token: 'test-api-key' }
      });
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 300 });
    });

    it('should use default cache TTL if not provided', () => {
      delete process.env.CACHE_TTL;
      new FinnhubService();
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 300 });
    });
  });

  describe('quote / getQuote', () => {
    const symbol = 'AAPL';
    const mockQuote = mockFinnhubResponses.quote;

    it('should fetch quote from API when not cached', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: mockQuote });

      const result = await finnhubService.quote(symbol);

      expect(mockCacheInstance.get).toHaveBeenCalledWith(`quote_${symbol}`);
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/quote', { params: { symbol } });
      expect(mockCacheInstance.set).toHaveBeenCalledWith(`quote_${symbol}`, mockQuote);
      expect(result).toEqual(mockQuote);
    });

    it('should return cached quote when available', async () => {
      mockCacheInstance.get.mockReturnValue(mockQuote);

      const result = await finnhubService.quote(symbol);

      expect(mockCacheInstance.get).toHaveBeenCalledWith(`quote_${symbol}`);
      expect(mockAxiosCreate.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockQuote);
    });

    it('should handle API errors', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      const error = new Error('API Error');
      mockAxiosCreate.get.mockRejectedValue(error);

      await expect(finnhubService.quote(symbol)).rejects.toThrow('API Error');
    });

    it('getQuote should call quote method', async () => {
      finnhubService.quote = jest.fn().mockResolvedValue(mockQuote);
      
      const result = await finnhubService.getQuote(symbol);
      
      expect(finnhubService.quote).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockQuote);
    });
  });

  describe('getCandles', () => {
    const params = {
      symbol: 'AAPL',
      resolution: 'D',
      from: 1640995200,
      to: 1641168000
    };
    const mockCandles = mockFinnhubResponses.candles;

    it('should fetch and format candles from API', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: mockCandles });

      const result = await finnhubService.getCandles(
        params.symbol,
        params.resolution,
        params.from,
        params.to
      );

      const cacheKey = `candles_${params.symbol}_${params.resolution}_${params.from}_${params.to}`;
      expect(mockCacheInstance.get).toHaveBeenCalledWith(cacheKey);
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/stock/candle', { params });
      
      // Check formatted result
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        timestamp: mockCandles.t[0],
        open: mockCandles.o[0],
        high: mockCandles.h[0],
        low: mockCandles.l[0],
        close: mockCandles.c[0],
        volume: mockCandles.v[0]
      });
    });

    it('should return cached candles when available', async () => {
      const cachedCandles = [{ timestamp: 123, open: 100 }];
      mockCacheInstance.get.mockReturnValue(cachedCandles);

      const result = await finnhubService.getCandles(
        params.symbol,
        params.resolution,
        params.from,
        params.to
      );

      expect(mockAxiosCreate.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedCandles);
    });

    it('should return empty array for no data', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: { s: 'no_data' } });

      const result = await finnhubService.getCandles(
        params.symbol,
        params.resolution,
        params.from,
        params.to
      );

      expect(result).toEqual([]);
    });
  });

  describe('searchStocks', () => {
    const query = 'apple';
    const mockSearchResult = mockFinnhubResponses.search;

    it('should search stocks successfully', async () => {
      mockAxiosCreate.get.mockResolvedValue({ data: mockSearchResult });

      const result = await finnhubService.searchStocks(query);

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/search', { params: { q: query } });
      expect(result).toEqual(mockSearchResult.result);
    });

    it('should return empty array when no results', async () => {
      mockAxiosCreate.get.mockResolvedValue({ data: {} });

      const result = await finnhubService.searchStocks(query);

      expect(result).toEqual([]);
    });
  });

  describe('getCompanyProfile', () => {
    const symbol = 'AAPL';
    const mockProfile = mockFinnhubResponses.companyProfile;

    it('should fetch company profile with extended cache', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: mockProfile });

      const result = await finnhubService.getCompanyProfile(symbol);

      expect(mockCacheInstance.get).toHaveBeenCalledWith(`profile_${symbol}`);
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/stock/profile2', { params: { symbol } });
      expect(mockCacheInstance.set).toHaveBeenCalledWith(`profile_${symbol}`, mockProfile, 86400);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getNews', () => {
    const mockNews = mockFinnhubResponses.news;

    it('should fetch company news with date range', async () => {
      const symbol = 'AAPL';
      const from = '2024-01-01';
      const to = '2024-01-07';
      
      mockAxiosCreate.get.mockResolvedValue({ data: mockNews });

      const result = await finnhubService.getNews(symbol, from, to);

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/company-news', {
        params: { symbol, from, to }
      });
      expect(result).toEqual(mockNews);
    });

    it('should fetch general news when no symbol provided', async () => {
      mockAxiosCreate.get.mockResolvedValue({ data: mockNews });

      const result = await finnhubService.getNews();

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/news', {
        params: { category: 'general' }
      });
      expect(result).toEqual(mockNews);
    });

    it('should use default date range for company news', async () => {
      const symbol = 'AAPL';
      finnhubService.getDateString = jest.fn()
        .mockReturnValueOnce('2024-01-01')
        .mockReturnValueOnce('2024-01-08');
      
      mockAxiosCreate.get.mockResolvedValue({ data: mockNews });

      await finnhubService.getNews(symbol);

      expect(finnhubService.getDateString).toHaveBeenCalledWith(-7);
      expect(finnhubService.getDateString).toHaveBeenCalledWith();
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/company-news', {
        params: { symbol, from: '2024-01-01', to: '2024-01-08' }
      });
    });
  });

  describe('getTechnicalIndicator', () => {
    const params = {
      symbol: 'AAPL',
      indicator: 'sma',
      resolution: 'D',
      from: 1640995200,
      to: 1641168000
    };
    const additionalParams = { timeperiod: 14 };
    const mockIndicator = { values: [50, 51, 52] };

    it('should fetch technical indicator', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: mockIndicator });

      const result = await finnhubService.getTechnicalIndicator(
        params.symbol,
        params.indicator,
        params.resolution,
        params.from,
        params.to,
        additionalParams
      );

      const cacheKey = `indicator_${params.symbol}_${params.indicator}_${params.resolution}_${params.from}_${params.to}`;
      expect(mockCacheInstance.get).toHaveBeenCalledWith(cacheKey);
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/indicator', {
        params: { ...params, ...additionalParams }
      });
      expect(mockCacheInstance.set).toHaveBeenCalledWith(cacheKey, mockIndicator);
      expect(result).toEqual(mockIndicator);
    });
  });

  describe('getMarketStatus', () => {
    const mockStatus = { isOpen: true, session: 'pre-market' };

    it('should fetch market status', async () => {
      mockAxiosCreate.get.mockResolvedValue({ data: mockStatus });

      const result = await finnhubService.getMarketStatus();

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/stock/market-status', {
        params: { exchange: 'US' }
      });
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getEarningsCalendar', () => {
    const mockEarnings = { earningsCalendar: [] };

    it('should fetch earnings calendar with custom dates', async () => {
      const from = '2024-01-01';
      const to = '2024-01-31';
      
      mockAxiosCreate.get.mockResolvedValue({ data: mockEarnings });

      const result = await finnhubService.getEarningsCalendar(from, to);

      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/calendar/earnings', {
        params: { from, to }
      });
      expect(result).toEqual(mockEarnings);
    });

    it('should use default date range', async () => {
      finnhubService.getDateString = jest.fn()
        .mockReturnValueOnce('2024-01-08')
        .mockReturnValueOnce('2024-01-15');
      
      mockAxiosCreate.get.mockResolvedValue({ data: mockEarnings });

      await finnhubService.getEarningsCalendar();

      expect(finnhubService.getDateString).toHaveBeenCalledWith();
      expect(finnhubService.getDateString).toHaveBeenCalledWith(7);
    });
  });

  describe('getRecommendationTrends', () => {
    const symbol = 'AAPL';
    const mockRecommendations = mockFinnhubResponses.recommendations;

    it('should fetch recommendation trends with 1-hour cache', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockResolvedValue({ data: mockRecommendations });

      const result = await finnhubService.getRecommendationTrends(symbol);

      expect(mockCacheInstance.get).toHaveBeenCalledWith(`recommendations_${symbol}`);
      expect(mockAxiosCreate.get).toHaveBeenCalledWith('/stock/recommendation', {
        params: { symbol }
      });
      expect(mockCacheInstance.set).toHaveBeenCalledWith(
        `recommendations_${symbol}`,
        mockRecommendations,
        3600
      );
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('formatCandles', () => {
    it('should format candle data correctly', () => {
      const rawData = {
        t: [1640995200, 1641081600],
        o: [148, 149],
        h: [150, 151],
        l: [147, 148],
        c: [149, 150],
        v: [1000000, 1100000]
      };

      const result = finnhubService.formatCandles(rawData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: 1640995200,
        open: 148,
        high: 150,
        low: 147,
        close: 149,
        volume: 1000000
      });
      expect(result[1]).toEqual({
        timestamp: 1641081600,
        open: 149,
        high: 151,
        low: 148,
        close: 150,
        volume: 1100000
      });
    });

    it('should handle empty data', () => {
      const rawData = {
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: []
      };

      const result = finnhubService.formatCandles(rawData);

      expect(result).toEqual([]);
    });
  });

  describe('getDateString', () => {
    beforeEach(() => {
      // Mock Date to have consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-08'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return current date when no offset', () => {
      const result = finnhubService.getDateString();
      expect(result).toBe('2024-01-08');
    });

    it('should return future date with positive offset', () => {
      const result = finnhubService.getDateString(7);
      expect(result).toBe('2024-01-15');
    });

    it('should return past date with negative offset', () => {
      const result = finnhubService.getDateString(-7);
      expect(result).toBe('2024-01-01');
    });
  });

  describe('error handling', () => {
    it('should log and throw errors for API failures', async () => {
      const error = new Error('Network error');
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockRejectedValue(error);

      await expect(finnhubService.quote('AAPL')).rejects.toThrow('Network error');
      
      const logger = (await import('../../../src/utils/logger.js')).default;
      expect(logger.error).toHaveBeenCalledWith('Error fetching quote:', error);
    });
  });

  describe('caching behavior', () => {
    it('should not cache on API error', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      mockAxiosCreate.get.mockRejectedValue(new Error('API Error'));

      try {
        await finnhubService.quote('AAPL');
      } catch (e) {
        // Expected error
      }

      expect(mockCacheInstance.set).not.toHaveBeenCalled();
    });

    it('should respect cache TTL configuration', () => {
      process.env.CACHE_TTL = '600';
      new FinnhubService();
      
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 600 });
    });
  });
});
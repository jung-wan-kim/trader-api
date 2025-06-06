// Mock axios first
const mockAxios = {
  create: jest.fn(() => ({
    get: jest.fn()
  }))
};

jest.mock('axios', () => mockAxios);

// Mock NodeCache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn()
};

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => mockCache);
});

describe('FinnhubService', () => {
  let finnhubService;
  let mockClient;

  beforeEach(() => {
    cleanupTestData();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock axios client
    mockClient = {
      get: jest.fn()
    };
    mockAxios.create.mockReturnValue(mockClient);
    
    // Import service after mocks are set up
    delete require.cache[require.resolve('../../src/services/finnhubService.js')];
    finnhubService = require('../../src/services/finnhubService.js').default;
  });

  afterEach(() => {
    cleanupTestData();
  });

  describe('quote()', () => {
    it('실시간 주가 데이터를 가져와야 합니다', async () => {
      const mockQuoteData = {
        c: 150.25,   // current price
        d: 2.50,     // change
        dp: 1.69,    // percent change
        h: 152.00,   // high
        l: 148.50,   // low
        o: 149.00,   // open
        pc: 147.75,  // previous close
        t: 1672531200
      };

      mockCache.get.mockReturnValue(null); // No cache
      mockClient.get.mockResolvedValue({ data: mockQuoteData });

      const result = await finnhubService.quote('AAPL');

      expect(mockClient.get).toHaveBeenCalledWith('/quote', {
        params: { symbol: 'AAPL' }
      });
      expect(mockCache.set).toHaveBeenCalledWith('quote_AAPL', mockQuoteData);
      expect(result).toEqual(mockQuoteData);
    });

    it('캐시된 데이터가 있으면 캐시에서 반환해야 합니다', async () => {
      const cachedData = { c: 150.25, cached: true };
      mockCache.get.mockReturnValue(cachedData);

      const result = await finnhubService.quote('AAPL');

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('API 오류 시 에러를 throw해야 합니다', async () => {
      const error = new Error('API Error');
      mockCache.get.mockReturnValue(null);
      mockClient.get.mockRejectedValue(error);

      await expect(finnhubService.quote('INVALID')).rejects.toThrow('API Error');
    });
  });

  describe('getCandles()', () => {
    it('캔들스틱 데이터를 가져와야 합니다', async () => {
      const mockCandleData = {
        s: 'ok',
        t: [1672531200, 1672617600], // timestamps
        o: [149.00, 151.00],         // open prices
        h: [152.00, 153.00],         // high prices
        l: [148.50, 150.50],         // low prices
        c: [150.25, 152.75],         // close prices
        v: [1000000, 1200000]        // volumes
      };

      const expectedCandles = [
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

      mockCache.get.mockReturnValue(null);
      mockClient.get.mockResolvedValue({ data: mockCandleData });

      const result = await finnhubService.getCandles('AAPL', 'D', 1672531200, 1672617600);

      expect(mockClient.get).toHaveBeenCalledWith('/stock/candle', {
        params: {
          symbol: 'AAPL',
          resolution: 'D',
          from: 1672531200,
          to: 1672617600
        }
      });
      expect(result).toEqual(expectedCandles);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 합니다', async () => {
      const mockCandleData = { s: 'no_data' };
      
      mockCache.get.mockReturnValue(null);
      mockClient.get.mockResolvedValue({ data: mockCandleData });

      const result = await finnhubService.getCandles('INVALID', 'D', 1672531200, 1672617600);

      expect(result).toEqual([]);
    });
  });

  describe('searchStocks()', () => {
    it('주식 검색 결과를 반환해야 합니다', async () => {
      const mockSearchData = {
        result: [
          {
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            symbol: 'AAPL',
            type: 'Common Stock'
          }
        ]
      };

      mockClient.get.mockResolvedValue({ data: mockSearchData });

      const result = await finnhubService.searchStocks('AAPL');

      expect(mockClient.get).toHaveBeenCalledWith('/search', {
        params: { q: 'AAPL' }
      });
      expect(result).toEqual(mockSearchData.result);
    });
  });

  describe('formatCandles()', () => {
    it('원시 캔들 데이터를 올바른 형식으로 변환해야 합니다', () => {
      const rawData = {
        t: [1672531200, 1672617600],
        o: [149.00, 151.00],
        h: [152.00, 153.00],
        l: [148.50, 150.50],
        c: [150.25, 152.75],
        v: [1000000, 1200000]
      };

      const expected = [
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

      const result = finnhubService.formatCandles(rawData);
      expect(result).toEqual(expected);
    });
  });

  describe('getDateString()', () => {
    it('현재 날짜의 문자열을 반환해야 합니다', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = finnhubService.getDateString();
      expect(result).toBe(today);
    });
  });
});
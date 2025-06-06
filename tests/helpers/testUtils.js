import request from 'supertest';

// Test data generators
export const generateTestUser = (overrides = {}) => ({
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
  investmentStyle: 'moderate',
  ...overrides,
});

export const generateTestPortfolio = (userId, overrides = {}) => ({
  user_id: userId,
  name: 'Test Portfolio',
  initial_capital: 10000,
  ...overrides,
});

export const generateTestRecommendation = (strategyId, overrides = {}) => ({
  strategy_id: strategyId,
  symbol: 'AAPL',
  action: 'buy',
  confidence_score: 0.85,
  entry_price: 150.00,
  stop_loss: 145.00,
  take_profit: 160.00,
  reasoning: 'Test reasoning',
  ...overrides,
});

export const generateTestTrade = (portfolioId, recommendationId, overrides = {}) => ({
  portfolio_id: portfolioId,
  recommendation_id: recommendationId,
  symbol: 'AAPL',
  action: 'buy',
  quantity: 10,
  entry_price: 150.00,
  status: 'open',
  ...overrides,
});

// Auth helpers
export const createAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

export const createTestApp = (app) => request(app);

// Async test helpers
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retryUntil = async (fn, condition, maxRetries = 10, delay = 100) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fn();
    if (condition(result)) {
      return result;
    }
    await waitFor(delay);
  }
  throw new Error('Retry limit exceeded');
};

// Error matchers
export const expectError = (response, statusCode, errorMessage) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.message).toContain(errorMessage);
  }
};

export const expectValidationError = (response, field) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('errors');
  if (field) {
    const fieldError = response.body.errors.find(err => err.path === field || err.param === field);
    expect(fieldError).toBeDefined();
  }
};

// Database helpers
export const cleanupTestData = async (supabaseAdmin, userId) => {
  // Delete in reverse order of dependencies
  await supabaseAdmin.from('trades').delete().eq('user_id', userId);
  await supabaseAdmin.from('recommendations').delete().eq('user_id', userId);
  await supabaseAdmin.from('portfolios').delete().eq('user_id', userId);
  await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
};

// Mock external services
export const mockFinnhubResponses = {
  quote: {
    c: 150.00, // Current price
    h: 152.00, // High
    l: 148.00, // Low
    o: 149.00, // Open
    pc: 148.50, // Previous close
    t: Date.now() / 1000,
  },
  candles: {
    s: 'ok',
    t: [1640995200, 1641081600, 1641168000], // timestamps
    o: [148, 149, 150], // open prices
    h: [150, 151, 152], // high prices
    l: [147, 148, 149], // low prices
    c: [149, 150, 151], // close prices
    v: [1000000, 1100000, 1200000], // volumes
  },
  companyProfile: {
    country: 'US',
    currency: 'USD',
    exchange: 'NASDAQ',
    ipo: '1980-12-12',
    marketCapitalization: 2500000,
    name: 'Apple Inc',
    phone: '14089961010',
    shareOutstanding: 16426.79,
    ticker: 'AAPL',
    weburl: 'https://www.apple.com/',
    logo: 'https://finnhub.io/api/logo?symbol=AAPL',
    finnhubIndustry: 'Technology',
  },
  search: {
    count: 1,
    result: [{
      description: 'APPLE INC',
      displaySymbol: 'AAPL',
      symbol: 'AAPL',
      type: 'Common Stock',
    }],
  },
  news: [
    {
      category: 'company',
      datetime: Date.now() / 1000,
      headline: 'Test news headline',
      id: 123456,
      image: 'https://example.com/image.jpg',
      related: 'AAPL',
      source: 'Test Source',
      summary: 'Test news summary',
      url: 'https://example.com/news',
    },
  ],
  recommendations: [
    {
      buy: 15,
      hold: 10,
      period: '2024-01-01',
      sell: 5,
      strongBuy: 20,
      strongSell: 2,
      symbol: 'AAPL',
    },
  ],
};

// Performance testing helpers
export const measureExecutionTime = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convert to milliseconds
  return { result, duration };
};

export const generateLoad = async (fn, concurrency = 10, iterations = 100) => {
  const results = [];
  
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < iterations; j++) {
      batch.push(measureExecutionTime(fn));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  
  return {
    totalRequests: results.length,
    averageTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    minTime: Math.min(...results.map(r => r.duration)),
    maxTime: Math.max(...results.map(r => r.duration)),
    errors: results.filter(r => r.result instanceof Error).length,
  };
};

// Security testing helpers
export const sqlInjectionPayloads = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
  "1' UNION SELECT NULL--",
  "<script>alert('XSS')</script>",
  "../../../etc/passwd",
  "{{7*7}}",
];

export const testSQLInjection = async (app, endpoint, method = 'post', authToken = null) => {
  const results = [];
  
  for (const payload of sqlInjectionPayloads) {
    const req = request(app)[method](endpoint);
    
    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }
    
    const response = await req.send({ 
      email: payload,
      password: payload,
      name: payload,
    });
    
    results.push({
      payload,
      status: response.status,
      blocked: response.status >= 400,
    });
  }
  
  return results;
};
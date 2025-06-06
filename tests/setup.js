// Test setup file
const path = require('path');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.FINNHUB_API_KEY = 'test_finnhub_key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.CACHE_TTL = '300';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.PORT = '3001';

// 테스트 타임아웃 설정
jest.setTimeout(15000);

// Mock global console to reduce noise in tests (선택적)
if (process.env.JEST_SILENT !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// 테스트 데이터 초기화 함수
global.setupTestData = () => {
  return {
    testUser: {
      id: 'test-user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      investment_style: 'aggressive'
    },
    testPortfolio: {
      id: 'test-portfolio-id-123',
      user_id: 'test-user-id-123',
      name: 'Test Portfolio',
      initial_capital: 10000,
      current_value: 12000,
      cash_balance: 2000
    },
    testPosition: {
      id: 'test-position-id-123',
      portfolio_id: 'test-portfolio-id-123',
      symbol: 'AAPL',
      quantity: 10,
      entry_price: 150.00,
      status: 'open'
    }
  };
};

// 테스트 후 정리 함수
global.cleanupTestData = () => {
  jest.clearAllMocks();
  jest.resetModules();
};

// Mock modules before they are imported
jest.mock('../src/config/database.js', () => ({
  supabase: {
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
  }
}));

jest.mock('../src/config/supabase.js', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    }
  },
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
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
    })),
    auth: {
      admin: {
        deleteUser: jest.fn()
      }
    }
  },
  verifySession: jest.fn()
}));

jest.mock('../src/utils/logger.ts', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => [])
  }))
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn()
  }));
});

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
    stream: {
      write: jest.fn()
    }
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));
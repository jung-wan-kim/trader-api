// Supabase mock implementations for testing

export const createMockSupabaseClient = () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
  };

  const mockFrom = (table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
  });

  return {
    auth: mockAuth,
    from: jest.fn(mockFrom),
  };
};

export const createMockSupabaseAdmin = () => {
  const baseClient = createMockSupabaseClient();
  
  return {
    ...baseClient,
    auth: {
      ...baseClient.auth,
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserById: jest.fn(),
        listUsers: jest.fn(),
      },
    },
  };
};

export const mockVerifySession = jest.fn();

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {
    name: 'Test User',
    investment_style: 'conservative',
  },
  created_at: '2024-01-01T00:00:00Z',
};

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  investment_style: 'conservative',
  risk_tolerance: 'low',
  subscription_tier: 'basic',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockSubscription = {
  id: 'sub-123',
  user_id: 'test-user-id',
  tier: 'premium',
  status: 'active',
  started_at: '2024-01-01T00:00:00Z',
  expires_at: '2025-01-01T00:00:00Z',
};

export const mockPortfolio = {
  id: 'portfolio-123',
  user_id: 'test-user-id',
  name: 'Main Portfolio',
  initial_capital: 10000,
  current_value: 12500,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockRecommendation = {
  id: 'rec-123',
  strategy_id: 'strat-123',
  symbol: 'AAPL',
  action: 'buy',
  confidence_score: 0.85,
  entry_price: 150.00,
  stop_loss: 145.00,
  take_profit: 160.00,
  reasoning: 'Strong upward trend with good volume',
  created_at: '2024-01-01T00:00:00Z',
};

// Helper to reset all mocks
export const resetSupabaseMocks = (supabase, supabaseAdmin) => {
  Object.values(supabase.auth).forEach(fn => {
    if (typeof fn === 'function' && fn.mockReset) {
      fn.mockReset();
    }
  });
  
  if (supabase.from.mockReset) {
    supabase.from.mockReset();
  }
  
  if (supabaseAdmin) {
    Object.values(supabaseAdmin.auth).forEach(fn => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset();
      }
    });
    
    Object.values(supabaseAdmin.auth.admin).forEach(fn => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset();
      }
    });
    
    if (supabaseAdmin.from.mockReset) {
      supabaseAdmin.from.mockReset();
    }
  }
};
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traders table
CREATE TABLE traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  trading_style VARCHAR(100),
  years_experience INTEGER,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2),
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID REFERENCES traders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trading_style VARCHAR(100),
  risk_level VARCHAR(50),
  win_rate DECIMAL(5,2),
  average_return DECIMAL(5,2),
  max_drawdown DECIMAL(5,2),
  sharpe_ratio DECIMAL(5,2),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  min_capital DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock recommendations table
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID REFERENCES traders(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  stock_code VARCHAR(10) NOT NULL,
  stock_name VARCHAR(255) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
  current_price DECIMAL(10,2) NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  stop_loss DECIMAL(10,2) NOT NULL,
  reasoning TEXT,
  confidence DECIMAL(5,2),
  risk_level VARCHAR(50),
  timeframe VARCHAR(50),
  technical_indicators JSONB,
  likes_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User portfolios table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Main Portfolio',
  initial_capital DECIMAL(12,2),
  current_value DECIMAL(12,2),
  total_profit_loss DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio positions table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  stock_code VARCHAR(10) NOT NULL,
  stock_name VARCHAR(255) NOT NULL,
  position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
  quantity INTEGER NOT NULL,
  entry_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  take_profit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  profit_loss DECIMAL(12,2),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User follows traders table
CREATE TABLE user_follows_traders (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trader_id UUID REFERENCES traders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, trader_id)
);

-- User subscribes to strategies table
CREATE TABLE user_strategy_subscriptions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, strategy_id)
);

-- User likes recommendations table
CREATE TABLE user_recommendation_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, recommendation_id)
);

-- Indexes for performance
CREATE INDEX idx_recommendations_trader_id ON recommendations(trader_id);
CREATE INDEX idx_recommendations_stock_code ON recommendations(stock_code);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_stock_code ON positions(stock_code);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_traders_updated_at BEFORE UPDATE ON traders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
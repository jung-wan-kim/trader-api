-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium', 'professional')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  subscription_end_date TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trading strategies table
CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('jesse_livermore', 'larry_williams', 'stan_weinstein')),
  min_tier TEXT NOT NULL DEFAULT 'basic' CHECK (min_tier IN ('basic', 'premium', 'professional')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user strategy subscriptions
CREATE TABLE IF NOT EXISTS public.user_strategy_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id),
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strategy_id)
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  strategy_id UUID REFERENCES public.trading_strategies(id),
  user_id UUID REFERENCES auth.users(id),
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'hold')),
  entry_price DECIMAL(10, 2),
  target_price DECIMAL(10, 2),
  stop_loss DECIMAL(10, 2),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  initial_capital DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.recommendations(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  entry_price DECIMAL(10, 2) NOT NULL,
  exit_price DECIMAL(10, 2),
  stop_loss DECIMAL(10, 2),
  take_profit DECIMAL(10, 2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  realized_pnl DECIMAL(12, 2),
  commission DECIMAL(8, 2) DEFAULT 0
);

-- Create market data cache table
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, data_type)
);

-- Create API keys table for external integrations
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default trading strategies
INSERT INTO public.trading_strategies (name, description, type, min_tier) VALUES
  ('Jesse Livermore Trend Following', 'Classic trend following with pyramiding', 'jesse_livermore', 'basic'),
  ('Larry Williams Momentum', 'Short-term momentum trading', 'larry_williams', 'premium'),
  ('Stan Weinstein Stage Analysis', 'Long-term stage-based investing', 'stan_weinstein', 'professional');

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strategy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for portfolios
CREATE POLICY "Users can view own portfolios" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for positions
CREATE POLICY "Users can view own positions" ON public.positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = positions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create positions in own portfolios" ON public.positions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions" ON public.positions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = positions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for recommendations
CREATE POLICY "Users can view recommendations for subscribed strategies" ON public.recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_strategy_subscriptions
      WHERE user_strategy_subscriptions.user_id = auth.uid()
      AND user_strategy_subscriptions.strategy_id = recommendations.strategy_id
      AND user_strategy_subscriptions.is_active = true
    )
  );

-- RLS Policies for user_strategy_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_strategy_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON public.user_strategy_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_strategy_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for API keys
CREATE POLICY "Users can view own API keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity logs
CREATE POLICY "Users can view own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Create functions for serverless logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check subscription access
CREATE OR REPLACE FUNCTION public.check_subscription_access(required_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  tier_levels JSONB := '{"basic": 1, "premium": 2, "professional": 3}'::JSONB;
BEGIN
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE id = auth.uid()
  AND subscription_status = 'active';
  
  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (tier_levels->>user_tier)::INT >= (tier_levels->>required_tier)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_activity(
  action_type TEXT,
  metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, metadata)
  VALUES (auth.uid(), action_type, metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_positions_portfolio_status ON public.positions(portfolio_id, status);
CREATE INDEX idx_positions_symbol ON public.positions(symbol);
CREATE INDEX idx_recommendations_strategy_active ON public.recommendations(strategy_id, is_active);
CREATE INDEX idx_recommendations_symbol ON public.recommendations(symbol);
CREATE INDEX idx_market_cache_symbol_type ON public.market_data_cache(symbol, data_type);
CREATE INDEX idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);
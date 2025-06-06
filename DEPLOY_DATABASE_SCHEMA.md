# 📊 데이터베이스 스키마 배포 가이드

## 🎯 SQL Editor에서 실행할 스키마

### Step 1: Supabase SQL Editor 접속
👉 **[SQL Editor 열기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/sql/new)**

### Step 2: 아래 SQL 전체를 복사하여 실행

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table (extends auth.users)
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

-- Insert default strategies
INSERT INTO public.trading_strategies (name, description, type, min_tier) VALUES
  ('Jesse Livermore Trend Following', 'Classic trend following with pyramiding', 'jesse_livermore', 'basic'),
  ('Larry Williams Momentum', 'Short-term momentum trading', 'larry_williams', 'premium'),
  ('Stan Weinstein Stage Analysis', 'Long-term stage-based investing', 'stan_weinstein', 'professional')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create other essential tables
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

CREATE TABLE IF NOT EXISTS public.user_strategy_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id),
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strategy_id)
);

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

CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, data_type)
);

-- Enable RLS on all tables
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strategy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage own portfolios" ON public.portfolios
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" ON public.user_strategy_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view subscribed recommendations" ON public.recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_strategy_subscriptions
      WHERE user_id = auth.uid()
      AND strategy_id = recommendations.strategy_id
      AND is_active = true
    )
  );

CREATE POLICY "Public read access to market cache" ON public.market_data_cache
  FOR SELECT USING (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
```

### Step 3: RUN 버튼 클릭

### Step 4: 성공 메시지 확인

## ✅ 완료 후 확인사항

1. **Table Editor**에서 테이블 생성 확인
2. **Authentication → Users**에서 사용자 생성 시 profiles 테이블에 자동 추가 확인

## 🎯 다음 단계

데이터베이스 스키마가 준비되면 Edge Functions 테스트를 다시 실행하세요:

```bash
node test-auth-flow.js
```
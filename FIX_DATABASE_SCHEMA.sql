-- 🔧 데이터베이스 스키마 수정 및 디버깅

-- 1. 테이블 존재 확인 및 재생성
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;
DROP TABLE IF EXISTS public.user_strategy_subscriptions CASCADE;
DROP TABLE IF EXISTS public.portfolios CASCADE;
DROP TABLE IF EXISTS public.trading_strategies CASCADE;
DROP TABLE IF EXISTS public.market_data_cache CASCADE;

-- 2. Trading strategies 테이블 재생성
CREATE TABLE public.trading_strategies (
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

-- 3. Portfolios 테이블 (currency 컬럼 포함)
CREATE TABLE public.portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  initial_capital DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD' NOT NULL,  -- currency 컬럼 추가!
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 나머지 테이블들
CREATE TABLE public.user_strategy_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id),
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strategy_id)
);

CREATE TABLE public.recommendations (
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

CREATE TABLE public.positions (
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

CREATE TABLE public.market_data_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, data_type)
);

-- 5. 기본 전략 데이터 삽입
INSERT INTO public.trading_strategies (name, description, type, min_tier) VALUES
  ('Jesse Livermore Trend Following', 'Classic trend following with pyramiding', 'jesse_livermore', 'basic'),
  ('Larry Williams Momentum', 'Short-term momentum trading', 'larry_williams', 'premium'),
  ('Stan Weinstein Stage Analysis', 'Long-term stage-based investing', 'stan_weinstein', 'professional')
ON CONFLICT DO NOTHING;

-- 6. RLS 활성화
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strategy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책
-- Portfolios
CREATE POLICY "Users can manage own portfolios" ON public.portfolios
  FOR ALL USING (auth.uid() = user_id);

-- User Strategy Subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.user_strategy_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Recommendations
CREATE POLICY "Users can view subscribed recommendations" ON public.recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_strategy_subscriptions
      WHERE user_id = auth.uid()
      AND strategy_id = recommendations.strategy_id
      AND is_active = true
    )
  );

-- Market Data Cache (public read)
CREATE POLICY "Public read access to market cache" ON public.market_data_cache
  FOR SELECT USING (true);

-- Trading Strategies (public read)
CREATE POLICY "Public read access to strategies" ON public.trading_strategies
  FOR SELECT USING (true);

-- Positions
CREATE POLICY "Users can view own positions" ON public.positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = positions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- 8. 권한 부여
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 9. 테스트용 캐시 데이터 삽입 (선택사항)
INSERT INTO public.market_data_cache (symbol, data_type, data, expires_at) VALUES
  ('AAPL', 'quote', '{"c": 150.25, "d": 1.5, "dp": 1.01, "h": 151.00, "l": 149.50, "o": 149.75, "pc": 148.75}'::jsonb, NOW() + INTERVAL '5 minutes')
ON CONFLICT (symbol, data_type) 
DO UPDATE SET 
  data = EXCLUDED.data,
  cached_at = NOW(),
  expires_at = NOW() + INTERVAL '5 minutes';

-- 10. 디버깅: 테이블 확인
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('portfolios', 'profiles', 'trading_strategies')
ORDER BY table_name, ordinal_position;
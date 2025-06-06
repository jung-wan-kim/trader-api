-- Trader API Database Schema for Supabase
-- Version: 1.0.0
-- Date: 2025-01-06

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('basic', 'premium', 'professional');
CREATE TYPE trader_type AS ENUM ('jesse_livermore', 'larry_williams', 'stan_weinstein');
CREATE TYPE recommendation_status AS ENUM ('active', 'closed', 'cancelled');
CREATE TYPE position_status AS ENUM ('open', 'closed', 'partial');
CREATE TYPE order_type AS ENUM ('buy', 'sell');
CREATE TYPE order_status AS ENUM ('pending', 'filled', 'cancelled', 'failed');
CREATE TYPE risk_level AS ENUM ('conservative', 'moderate', 'aggressive');

-- =====================================================
-- 1. USERS TABLE (extends Supabase Auth)
-- =====================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    subscription_tier subscription_tier DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    risk_profile risk_level DEFAULT 'moderate',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    payment_method JSONB,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    stripe_subscription_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- =====================================================
-- 3. TRADER STRATEGIES TABLE
-- =====================================================
CREATE TABLE public.trader_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_type trader_type NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    characteristics JSONB NOT NULL DEFAULT '{}',
    risk_parameters JSONB NOT NULL DEFAULT '{}',
    indicators JSONB NOT NULL DEFAULT '[]',
    time_frame TEXT,
    min_investment DECIMAL(10,2) DEFAULT 1000,
    expected_annual_return DECIMAL(5,2),
    max_drawdown DECIMAL(5,2),
    win_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trader_strategies
CREATE INDEX idx_trader_strategies_trader_type ON public.trader_strategies(trader_type);
CREATE INDEX idx_trader_strategies_is_active ON public.trader_strategies(is_active);

-- =====================================================
-- 4. STOCK RECOMMENDATIONS TABLE
-- =====================================================
CREATE TABLE public.stock_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES public.trader_strategies(id),
    symbol TEXT NOT NULL,
    action order_type NOT NULL,
    entry_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    stop_loss DECIMAL(10,2) NOT NULL,
    take_profit DECIMAL(10,2),
    position_size_percentage DECIMAL(5,2) NOT NULL CHECK (position_size_percentage > 0 AND position_size_percentage <= 100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    analysis JSONB NOT NULL DEFAULT '{}',
    technical_indicators JSONB DEFAULT '{}',
    status recommendation_status DEFAULT 'active',
    closed_at TIMESTAMPTZ,
    closed_price DECIMAL(10,2),
    profit_loss_percentage DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stock_recommendations
CREATE INDEX idx_recommendations_strategy_id ON public.stock_recommendations(strategy_id);
CREATE INDEX idx_recommendations_symbol ON public.stock_recommendations(symbol);
CREATE INDEX idx_recommendations_status ON public.stock_recommendations(status);
CREATE INDEX idx_recommendations_created_at ON public.stock_recommendations(created_at DESC);

-- =====================================================
-- 5. PORTFOLIOS TABLE
-- =====================================================
CREATE TABLE public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initial_capital DECIMAL(12,2) NOT NULL,
    current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    cash_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_profit_loss DECIMAL(12,2) DEFAULT 0,
    total_profit_loss_percentage DECIMAL(8,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Indexes for portfolios
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_portfolios_is_default ON public.portfolios(is_default);
CREATE INDEX idx_portfolios_is_active ON public.portfolios(is_active);

-- =====================================================
-- 6. PORTFOLIO POSITIONS TABLE
-- =====================================================
CREATE TABLE public.portfolio_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.stock_recommendations(id),
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    average_cost DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    current_value DECIMAL(12,2),
    profit_loss DECIMAL(12,2),
    profit_loss_percentage DECIMAL(8,2),
    status position_status DEFAULT 'open',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_price DECIMAL(10,2),
    stop_loss DECIMAL(10,2),
    take_profit DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for portfolio_positions
CREATE INDEX idx_positions_portfolio_id ON public.portfolio_positions(portfolio_id);
CREATE INDEX idx_positions_recommendation_id ON public.portfolio_positions(recommendation_id);
CREATE INDEX idx_positions_symbol ON public.portfolio_positions(symbol);
CREATE INDEX idx_positions_status ON public.portfolio_positions(status);
CREATE INDEX idx_positions_opened_at ON public.portfolio_positions(opened_at DESC);

-- =====================================================
-- 7. TRADE HISTORY TABLE
-- =====================================================
CREATE TABLE public.trade_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    position_id UUID REFERENCES public.portfolio_positions(id),
    recommendation_id UUID REFERENCES public.stock_recommendations(id),
    symbol TEXT NOT NULL,
    order_type order_type NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    commission DECIMAL(8,2) DEFAULT 0,
    status order_status DEFAULT 'pending',
    executed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trade_history
CREATE INDEX idx_trades_portfolio_id ON public.trade_history(portfolio_id);
CREATE INDEX idx_trades_position_id ON public.trade_history(position_id);
CREATE INDEX idx_trades_symbol ON public.trade_history(symbol);
CREATE INDEX idx_trades_order_type ON public.trade_history(order_type);
CREATE INDEX idx_trades_status ON public.trade_history(status);
CREATE INDEX idx_trades_executed_at ON public.trade_history(executed_at DESC);

-- =====================================================
-- 8. RISK SETTINGS TABLE
-- =====================================================
CREATE TABLE public.risk_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    max_position_size_percentage DECIMAL(5,2) DEFAULT 10 CHECK (max_position_size_percentage > 0 AND max_position_size_percentage <= 100),
    max_portfolio_risk_percentage DECIMAL(5,2) DEFAULT 20 CHECK (max_portfolio_risk_percentage > 0 AND max_portfolio_risk_percentage <= 100),
    default_stop_loss_percentage DECIMAL(5,2) DEFAULT 5 CHECK (default_stop_loss_percentage > 0 AND default_stop_loss_percentage <= 50),
    default_take_profit_percentage DECIMAL(5,2) DEFAULT 15 CHECK (default_take_profit_percentage > 0),
    max_daily_trades INTEGER DEFAULT 10,
    max_open_positions INTEGER DEFAULT 20,
    risk_reward_ratio DECIMAL(3,1) DEFAULT 2.0 CHECK (risk_reward_ratio >= 1),
    use_trailing_stop BOOLEAN DEFAULT false,
    trailing_stop_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, portfolio_id)
);

-- Indexes for risk_settings
CREATE INDEX idx_risk_settings_user_id ON public.risk_settings(user_id);
CREATE INDEX idx_risk_settings_portfolio_id ON public.risk_settings(portfolio_id);

-- =====================================================
-- 9. MARKET DATA TABLE (Cache)
-- =====================================================
CREATE TABLE public.market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('quote', 'candle', 'indicator', 'news', 'sentiment')),
    timeframe TEXT,
    data JSONB NOT NULL,
    source TEXT DEFAULT 'finnhub',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, data_type, timeframe, fetched_at)
);

-- Indexes for market_data
CREATE INDEX idx_market_data_symbol ON public.market_data(symbol);
CREATE INDEX idx_market_data_type ON public.market_data(data_type);
CREATE INDEX idx_market_data_expires_at ON public.market_data(expires_at);
CREATE INDEX idx_market_data_fetched_at ON public.market_data(fetched_at DESC);

-- =====================================================
-- 10. STRATEGY PERFORMANCE TABLE
-- =====================================================
CREATE TABLE public.strategy_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES public.trader_strategies(id),
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_recommendations INTEGER DEFAULT 0,
    successful_recommendations INTEGER DEFAULT 0,
    failed_recommendations INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2),
    average_return DECIMAL(8,2),
    total_return DECIMAL(8,2),
    max_drawdown DECIMAL(8,2),
    sharpe_ratio DECIMAL(5,2),
    trades_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, period_type, period_start)
);

-- Indexes for strategy_performance
CREATE INDEX idx_performance_strategy_id ON public.strategy_performance(strategy_id);
CREATE INDEX idx_performance_period_type ON public.strategy_performance(period_type);
CREATE INDEX idx_performance_period_start ON public.strategy_performance(period_start DESC);

-- =====================================================
-- ADDITIONAL TABLES
-- =====================================================

-- User Strategy Subscriptions (many-to-many)
CREATE TABLE public.user_strategy_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    strategy_id UUID NOT NULL REFERENCES public.trader_strategies(id),
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    UNIQUE(user_id, strategy_id)
);

CREATE INDEX idx_user_strategies_user_id ON public.user_strategy_subscriptions(user_id);
CREATE INDEX idx_user_strategies_strategy_id ON public.user_strategy_subscriptions(strategy_id);
CREATE INDEX idx_user_strategies_is_active ON public.user_strategy_subscriptions(is_active);

-- Watchlist
CREATE TABLE public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX idx_watchlists_symbol ON public.watchlists(symbol);

-- Alerts
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('price', 'recommendation', 'portfolio', 'news')),
    condition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_is_active ON public.alerts(is_active);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();', 
            t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update portfolio value
CREATE OR REPLACE FUNCTION update_portfolio_value()
RETURNS TRIGGER AS $$
DECLARE
    v_portfolio_id UUID;
    v_total_value DECIMAL(12,2);
    v_total_invested DECIMAL(12,2);
    v_cash_balance DECIMAL(12,2);
BEGIN
    -- Get portfolio ID based on trigger context
    IF TG_OP = 'DELETE' THEN
        v_portfolio_id := OLD.portfolio_id;
    ELSE
        v_portfolio_id := NEW.portfolio_id;
    END IF;

    -- Calculate total value from open positions
    SELECT 
        COALESCE(SUM(current_value), 0),
        COALESCE(SUM(quantity * average_cost), 0)
    INTO v_total_value, v_total_invested
    FROM portfolio_positions
    WHERE portfolio_id = v_portfolio_id AND status = 'open';

    -- Get cash balance
    SELECT cash_balance INTO v_cash_balance
    FROM portfolios
    WHERE id = v_portfolio_id;

    -- Update portfolio
    UPDATE portfolios
    SET 
        current_value = v_total_value + v_cash_balance,
        total_invested = v_total_invested,
        total_profit_loss = (v_total_value + v_cash_balance) - initial_capital,
        total_profit_loss_percentage = 
            CASE 
                WHEN initial_capital > 0 
                THEN ((v_total_value + v_cash_balance) - initial_capital) / initial_capital * 100
                ELSE 0
            END,
        updated_at = NOW()
    WHERE id = v_portfolio_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for portfolio value updates
CREATE TRIGGER update_portfolio_on_position_change
AFTER INSERT OR UPDATE OR DELETE ON portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_value();

-- Function to calculate position profit/loss
CREATE OR REPLACE FUNCTION calculate_position_pl()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_price IS NOT NULL AND NEW.quantity > 0 THEN
        NEW.current_value := NEW.quantity * NEW.current_price;
        NEW.profit_loss := NEW.current_value - (NEW.quantity * NEW.average_cost);
        NEW.profit_loss_percentage := 
            CASE 
                WHEN NEW.average_cost > 0 
                THEN ((NEW.current_price - NEW.average_cost) / NEW.average_cost) * 100
                ELSE 0
            END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for position P/L calculation
CREATE TRIGGER calculate_position_pl_trigger
BEFORE INSERT OR UPDATE ON portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION calculate_position_pl();

-- Function to validate subscription tier access
CREATE OR REPLACE FUNCTION check_subscription_access(
    p_user_id UUID,
    p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_tier subscription_tier;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT subscription_tier, subscription_expires_at 
    INTO v_tier, v_expires_at
    FROM users 
    WHERE id = p_user_id;

    -- Check if subscription is expired
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN FALSE;
    END IF;

    -- Check feature access based on tier
    CASE p_feature
        WHEN 'unlimited_recommendations' THEN
            RETURN v_tier IN ('premium', 'professional');
        WHEN 'all_strategies' THEN
            RETURN v_tier IN ('premium', 'professional');
        WHEN 'real_time_alerts' THEN
            RETURN v_tier IN ('premium', 'professional');
        WHEN 'api_access' THEN
            RETURN v_tier = 'professional';
        WHEN 'backtesting' THEN
            RETURN v_tier = 'professional';
        ELSE
            RETURN TRUE; -- Default allow for unknown features
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strategy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trader strategies table policies (public read)
CREATE POLICY "Anyone can view active strategies" ON public.trader_strategies
    FOR SELECT USING (is_active = true);

-- Stock recommendations policies
CREATE POLICY "Users can view recommendations based on subscription" ON public.stock_recommendations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (
                u.subscription_tier != 'basic'
                OR (
                    SELECT COUNT(*) FROM stock_recommendations sr
                    WHERE sr.created_at::date = CURRENT_DATE
                    AND EXISTS (
                        SELECT 1 FROM user_strategy_subscriptions uss
                        WHERE uss.user_id = auth.uid()
                        AND uss.strategy_id = sr.strategy_id
                        AND uss.is_active = true
                    )
                ) < 3
            )
        )
    );

-- Portfolios table policies
CREATE POLICY "Users can view own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON public.portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- Portfolio positions table policies
CREATE POLICY "Users can manage own positions" ON public.portfolio_positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM portfolios p
            WHERE p.id = portfolio_id
            AND p.user_id = auth.uid()
        )
    );

-- Trade history table policies
CREATE POLICY "Users can view own trades" ON public.trade_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM portfolios p
            WHERE p.id = portfolio_id
            AND p.user_id = auth.uid()
        )
    );

-- Risk settings table policies
CREATE POLICY "Users can manage own risk settings" ON public.risk_settings
    FOR ALL USING (auth.uid() = user_id);

-- Market data table policies (public read with caching)
CREATE POLICY "Anyone can view market data" ON public.market_data
    FOR SELECT USING (true);

-- Strategy performance table policies (public read)
CREATE POLICY "Anyone can view strategy performance" ON public.strategy_performance
    FOR SELECT USING (true);

-- User strategy subscriptions policies
CREATE POLICY "Users can manage own strategy subscriptions" ON public.user_strategy_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Watchlists table policies
CREATE POLICY "Users can manage own watchlist" ON public.watchlists
    FOR ALL USING (auth.uid() = user_id);

-- Alerts table policies
CREATE POLICY "Users can manage own alerts" ON public.alerts
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- INITIAL DATA SEED
-- =====================================================

-- Insert default trader strategies
INSERT INTO public.trader_strategies (trader_type, name, description, characteristics, risk_parameters, indicators, time_frame, min_investment, expected_annual_return, max_drawdown, win_rate) VALUES
(
    'jesse_livermore',
    'Jesse Livermore - Trend Following',
    'Follow the trend, add to winners, cut losers quickly. Focus on market leaders showing strong momentum.',
    '{
        "style": "Trend Following",
        "holding_period": "weeks to months",
        "key_principles": [
            "Trade with the trend",
            "Add to winning positions (pyramiding)",
            "Cut losses quickly",
            "Focus on market leaders"
        ]
    }'::jsonb,
    '{
        "max_position_size": 10,
        "stop_loss": 7,
        "pyramiding_enabled": true,
        "max_pyramiding_levels": 3
    }'::jsonb,
    '[
        "price_momentum",
        "volume_analysis",
        "pivot_points",
        "52_week_high",
        "relative_strength"
    ]'::jsonb,
    'daily',
    5000,
    25.5,
    15.0,
    65.0
),
(
    'larry_williams',
    'Larry Williams - Short-term Momentum',
    'Capture short-term price movements using volatility breakouts and momentum indicators.',
    '{
        "style": "Short-term Trading",
        "holding_period": "1-5 days",
        "key_principles": [
            "Volatility breakout entries",
            "Same day or next day exits",
            "Overbought/oversold reversals",
            "Market timing is crucial"
        ]
    }'::jsonb,
    '{
        "max_position_size": 5,
        "stop_loss": 3,
        "daily_loss_limit": 6,
        "intraday_trading": true
    }'::jsonb,
    '[
        "williams_r",
        "volatility_breakout",
        "market_timing",
        "atr",
        "volume_spike"
    ]'::jsonb,
    'hourly',
    10000,
    35.0,
    10.0,
    70.0
),
(
    'stan_weinstein',
    'Stan Weinstein - Stage Analysis',
    'Long-term investment based on technical stage analysis. Buy in Stage 2, sell in Stage 4.',
    '{
        "style": "Position Trading",
        "holding_period": "months to years",
        "key_principles": [
            "Buy during Stage 2 (advancing phase)",
            "Avoid Stage 1 (basing) and Stage 3 (top)",
            "Sell during Stage 4 (declining phase)",
            "Use 30-week moving average as key indicator"
        ]
    }'::jsonb,
    '{
        "max_position_size": 15,
        "stop_loss": 10,
        "use_30_week_ma": true,
        "sector_rotation": true
    }'::jsonb,
    '[
        "30_week_ma",
        "relative_strength",
        "volume_analysis",
        "stage_analysis",
        "sector_performance"
    ]'::jsonb,
    'weekly',
    10000,
    20.0,
    20.0,
    55.0
);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    
    -- Create default portfolio
    INSERT INTO public.portfolios (user_id, name, initial_capital, cash_balance, is_default)
    VALUES (NEW.id, 'Main Portfolio', 10000, 10000, true);
    
    -- Create default risk settings
    INSERT INTO public.risk_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Create materialized view for user portfolio summary
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT 
    p.user_id,
    p.id as portfolio_id,
    p.name as portfolio_name,
    p.current_value,
    p.total_profit_loss,
    p.total_profit_loss_percentage,
    COUNT(DISTINCT pp.symbol) as total_positions,
    COUNT(DISTINCT CASE WHEN pp.profit_loss > 0 THEN pp.id END) as winning_positions,
    COUNT(DISTINCT CASE WHEN pp.profit_loss < 0 THEN pp.id END) as losing_positions
FROM portfolios p
LEFT JOIN portfolio_positions pp ON p.id = pp.portfolio_id AND pp.status = 'open'
GROUP BY p.user_id, p.id, p.name, p.current_value, p.total_profit_loss, p.total_profit_loss_percentage;

-- Create index on materialized view
CREATE INDEX idx_portfolio_summary_user_id ON portfolio_summary(user_id);

-- Function to refresh portfolio summary
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT AND LOGGING
-- =====================================================

-- Audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    )
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_portfolios AFTER INSERT OR UPDATE OR DELETE ON portfolios
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trades AFTER INSERT OR UPDATE OR DELETE ON trade_history
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_positions AFTER INSERT OR UPDATE OR DELETE ON portfolio_positions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions on all sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.users IS 'Extended user profile data linked to Supabase Auth';
COMMENT ON TABLE public.subscriptions IS 'User subscription history and payment information';
COMMENT ON TABLE public.trader_strategies IS 'Trading strategies based on legendary traders';
COMMENT ON TABLE public.stock_recommendations IS 'AI-generated stock recommendations based on strategies';
COMMENT ON TABLE public.portfolios IS 'User investment portfolios';
COMMENT ON TABLE public.portfolio_positions IS 'Individual stock positions within portfolios';
COMMENT ON TABLE public.trade_history IS 'Complete history of all trades executed';
COMMENT ON TABLE public.risk_settings IS 'User-defined risk management parameters';
COMMENT ON TABLE public.market_data IS 'Cached market data from external APIs';
COMMENT ON TABLE public.strategy_performance IS 'Historical performance metrics for each strategy';

COMMENT ON FUNCTION check_subscription_access IS 'Validates user access to features based on subscription tier';
COMMENT ON FUNCTION update_portfolio_value IS 'Automatically updates portfolio value when positions change';
COMMENT ON FUNCTION calculate_position_pl IS 'Calculates profit/loss for positions in real-time';
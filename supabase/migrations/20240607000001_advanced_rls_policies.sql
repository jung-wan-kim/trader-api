-- Advanced Row Level Security Policies for Trader API

-- ============================================
-- Profiles Table Policies
-- ============================================

-- Allow users to insert their own profile on signup
CREATE POLICY "Users can insert own profile on signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role to manage profiles (for admin functions)
CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- Trading Strategies Table Policies
-- ============================================

-- Everyone can view active strategies
CREATE POLICY "Anyone can view active strategies" ON public.trading_strategies
  FOR SELECT USING (is_active = true);

-- Only admins can manage strategies
CREATE POLICY "Only admins can manage strategies" ON public.trading_strategies
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- User Strategy Subscriptions Policies
-- ============================================

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON public.user_strategy_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Recommendations Table Policies
-- ============================================

-- Allow creating recommendations for subscribed users (via Edge Functions)
CREATE POLICY "Edge functions can create recommendations" ON public.recommendations
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.user_strategy_subscriptions
      WHERE user_id = auth.uid()
      AND strategy_id = recommendations.strategy_id
      AND is_active = true
    ))
  );

-- Users can update their own recommendations (mark as viewed, etc)
CREATE POLICY "Users can update own recommendations" ON public.recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Portfolios Table Policies  
-- ============================================

-- Limit number of portfolios per user based on subscription
CREATE POLICY "Portfolio creation limit by subscription" ON public.portfolios
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      SELECT COUNT(*) FROM public.portfolios p
      WHERE p.user_id = auth.uid() AND p.is_active = true
    ) < CASE 
      WHEN (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) = 'professional' THEN 10
      WHEN (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) = 'premium' THEN 5
      ELSE 3
    END
  );

-- ============================================
-- Positions Table Policies
-- ============================================

-- Prevent users from modifying closed positions
CREATE POLICY "Cannot modify closed positions" ON public.positions
  FOR UPDATE USING (
    status = 'open' AND
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = positions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Allow users to delete only cancelled positions
CREATE POLICY "Users can delete cancelled positions" ON public.positions
  FOR DELETE USING (
    status = 'cancelled' AND
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = positions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- ============================================
-- Market Data Cache Policies
-- ============================================

-- Everyone can read cached market data
CREATE POLICY "Public read access to market cache" ON public.market_data_cache
  FOR SELECT USING (true);

-- Only Edge Functions can write to cache
CREATE POLICY "Only functions can write to cache" ON public.market_data_cache
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Only functions can update cache" ON public.market_data_cache
  FOR UPDATE USING (auth.jwt()->>'role' = 'service_role');

-- Auto-delete expired cache entries
CREATE POLICY "Anyone can delete expired cache" ON public.market_data_cache
  FOR DELETE USING (expires_at < NOW());

-- ============================================
-- API Keys Table Policies
-- ============================================

-- Users can update their own API keys (e.g., deactivate)
CREATE POLICY "Users can update own API keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Limit number of API keys per user
CREATE POLICY "API key creation limit" ON public.api_keys
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      SELECT COUNT(*) FROM public.api_keys k
      WHERE k.user_id = auth.uid() AND k.is_active = true
    ) < 5
  );

-- ============================================
-- Activity Logs Policies
-- ============================================

-- Prevent users from modifying activity logs
CREATE POLICY "Activity logs are immutable" ON public.activity_logs
  FOR UPDATE USING (false);

CREATE POLICY "Activity logs cannot be deleted by users" ON public.activity_logs
  FOR DELETE USING (false);

-- ============================================
-- Additional Security Functions
-- ============================================

-- Function to check if user has sufficient balance for position
CREATE OR REPLACE FUNCTION public.check_portfolio_balance(
  p_portfolio_id UUID,
  p_position_size DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_initial_capital DECIMAL;
  v_open_positions_value DECIMAL;
  v_available_capital DECIMAL;
BEGIN
  -- Get portfolio initial capital
  SELECT initial_capital INTO v_initial_capital
  FROM public.portfolios
  WHERE id = p_portfolio_id
  AND user_id = auth.uid();
  
  IF v_initial_capital IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate value of open positions
  SELECT COALESCE(SUM(entry_price * quantity), 0) INTO v_open_positions_value
  FROM public.positions
  WHERE portfolio_id = p_portfolio_id
  AND status = 'open';
  
  -- Calculate available capital
  v_available_capital := v_initial_capital - v_open_positions_value;
  
  RETURN v_available_capital >= p_position_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce position size limits
CREATE OR REPLACE FUNCTION public.check_position_size_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio_capital DECIMAL;
  v_position_size DECIMAL;
  v_max_position_size DECIMAL;
BEGIN
  IF NEW.status != 'open' THEN
    RETURN NEW;
  END IF;
  
  -- Get portfolio capital
  SELECT initial_capital INTO v_portfolio_capital
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;
  
  -- Calculate position size
  v_position_size := NEW.entry_price * NEW.quantity;
  
  -- Max 10% per position
  v_max_position_size := v_portfolio_capital * 0.1;
  
  IF v_position_size > v_max_position_size THEN
    RAISE EXCEPTION 'Position size (%) exceeds maximum allowed (10%% of portfolio capital: %)',
      v_position_size, v_max_position_size;
  END IF;
  
  -- Check available balance
  IF NOT public.check_portfolio_balance(NEW.portfolio_id, v_position_size) THEN
    RAISE EXCEPTION 'Insufficient portfolio balance for this position';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for position size validation
CREATE TRIGGER validate_position_size
  BEFORE INSERT OR UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_position_size_limit();

-- Function to auto-close positions at stop loss or take profit
CREATE OR REPLACE FUNCTION public.auto_close_positions()
RETURNS void AS $$
DECLARE
  v_position RECORD;
  v_current_price DECIMAL;
BEGIN
  -- This function would be called periodically by a scheduled job
  -- For now, it's a placeholder for the auto-close logic
  
  FOR v_position IN 
    SELECT p.*, m.data->>'c' as current_price
    FROM public.positions p
    LEFT JOIN public.market_data_cache m ON m.symbol = p.symbol AND m.data_type = 'quote'
    WHERE p.status = 'open'
    AND (p.stop_loss IS NOT NULL OR p.take_profit IS NOT NULL)
  LOOP
    v_current_price := v_position.current_price::DECIMAL;
    
    -- Check stop loss
    IF v_position.stop_loss IS NOT NULL THEN
      IF (v_position.side = 'long' AND v_current_price <= v_position.stop_loss) OR
         (v_position.side = 'short' AND v_current_price >= v_position.stop_loss) THEN
        -- Close position at stop loss
        UPDATE public.positions
        SET status = 'closed',
            exit_price = v_position.stop_loss,
            closed_at = NOW(),
            realized_pnl = CASE
              WHEN side = 'long' THEN (v_position.stop_loss - entry_price) * quantity
              ELSE (entry_price - v_position.stop_loss) * quantity
            END
        WHERE id = v_position.id;
      END IF;
    END IF;
    
    -- Check take profit
    IF v_position.take_profit IS NOT NULL THEN
      IF (v_position.side = 'long' AND v_current_price >= v_position.take_profit) OR
         (v_position.side = 'short' AND v_current_price <= v_position.take_profit) THEN
        -- Close position at take profit
        UPDATE public.positions
        SET status = 'closed',
            exit_price = v_position.take_profit,
            closed_at = NOW(),
            realized_pnl = CASE
              WHEN side = 'long' THEN (v_position.take_profit - entry_price) * quantity
              ELSE (entry_price - v_position.take_profit) * quantity
            END
        WHERE id = v_position.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run auto-close (requires pg_cron extension)
-- This is a placeholder - actual implementation depends on your Supabase plan
-- SELECT cron.schedule('auto-close-positions', '*/1 * * * *', 'SELECT public.auto_close_positions();');

-- ============================================
-- Performance Optimization Views
-- ============================================

-- Create a view for portfolio summary with proper RLS
CREATE OR REPLACE VIEW public.portfolio_summary AS
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.initial_capital,
  p.currency,
  COUNT(DISTINCT pos.id) FILTER (WHERE pos.status = 'open') as open_positions,
  COUNT(DISTINCT pos.id) FILTER (WHERE pos.status = 'closed') as closed_positions,
  COALESCE(SUM(pos.realized_pnl) FILTER (WHERE pos.status = 'closed'), 0) as total_realized_pnl,
  p.created_at
FROM public.portfolios p
LEFT JOIN public.positions pos ON pos.portfolio_id = p.id
WHERE p.is_active = true
GROUP BY p.id;

-- Apply RLS to the view
ALTER VIEW public.portfolio_summary SET (security_invoker = true);

-- Create a materialized view for strategy performance (updated daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.strategy_performance AS
SELECT 
  s.id as strategy_id,
  s.name as strategy_name,
  s.type as strategy_type,
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = true) as active_recommendations,
  COUNT(DISTINCT p.id) as total_positions,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'closed' AND p.realized_pnl > 0) as winning_positions,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'closed' AND p.realized_pnl < 0) as losing_positions,
  COALESCE(AVG(r.confidence), 0) as avg_confidence,
  COALESCE(SUM(p.realized_pnl) FILTER (WHERE p.status = 'closed'), 0) as total_pnl
FROM public.trading_strategies s
LEFT JOIN public.recommendations r ON r.strategy_id = s.id
LEFT JOIN public.positions p ON p.recommendation_id = r.id
GROUP BY s.id;

-- Create index on materialized view
CREATE INDEX idx_strategy_performance_pnl ON public.strategy_performance(total_pnl DESC);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION public.refresh_strategy_performance()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.strategy_performance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
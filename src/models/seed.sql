-- Seed data for development/testing

-- Insert test traders
INSERT INTO traders (id, name, bio, trading_style, years_experience, verified, rating, followers_count) VALUES
('11111111-1111-1111-1111-111111111111', 'Jesse Livermore Bot', 'AI-powered trading based on Jesse Livermore principles', 'SWING_TRADING', 5, true, 4.8, 15234),
('22222222-2222-2222-2222-222222222222', 'Larry Williams AI', 'Pattern recognition using Larry Williams strategies', 'DAY_TRADING', 3, true, 4.6, 8921),
('33333333-3333-3333-3333-333333333333', 'Stan Weinstein System', 'Stage analysis and trend following', 'POSITION_TRADING', 7, true, 4.7, 12456);

-- Insert test strategies
INSERT INTO strategies (id, trader_id, name, description, trading_style, risk_level, win_rate, average_return, max_drawdown, sharpe_ratio, min_capital) VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'Momentum Breakout Strategy', 'Trading breakouts with momentum confirmation', 'SWING_TRADING', 'MEDIUM', 68.5, 3.2, 12.5, 1.85, 10000),
('bbbb2222-bbbb-2222-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'Pattern Day Trading', 'Intraday trading based on chart patterns', 'DAY_TRADING', 'HIGH', 72.3, 2.1, 8.5, 2.15, 25000),
('cccc3333-cccc-3333-cccc-333333333333', '33333333-3333-3333-3333-333333333333', 'Stage 2 Trend Following', 'Long-term positions in stage 2 uptrends', 'POSITION_TRADING', 'LOW', 65.2, 5.8, 15.2, 1.65, 5000);

-- Insert sample recommendations
INSERT INTO recommendations (trader_id, strategy_id, stock_code, stock_name, action, current_price, target_price, stop_loss, reasoning, confidence, risk_level, timeframe) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'AAPL', 'Apple Inc.', 'BUY', 175.50, 190.00, 168.00, 'Strong momentum breakout above key resistance with increasing volume', 85.5, 'MEDIUM', 'MEDIUM'),
('22222222-2222-2222-2222-222222222222', 'bbbb2222-bbbb-2222-bbbb-222222222222', 'NVDA', 'NVIDIA Corp.', 'BUY', 425.00, 450.00, 410.00, 'Bullish flag pattern forming on daily chart', 78.2, 'HIGH', 'SHORT'),
('33333333-3333-3333-3333-333333333333', 'cccc3333-cccc-3333-cccc-333333333333', 'MSFT', 'Microsoft Corp.', 'HOLD', 380.00, 400.00, 365.00, 'In stage 2 uptrend but approaching resistance', 72.8, 'LOW', 'LONG');

-- Create stored procedures for analytics
CREATE OR REPLACE FUNCTION increment_likes(rec_id UUID) 
RETURNS void AS $$
BEGIN
  UPDATE recommendations 
  SET likes_count = likes_count + 1 
  WHERE id = rec_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(rec_id UUID) 
RETURNS void AS $$
BEGIN
  UPDATE recommendations 
  SET likes_count = GREATEST(likes_count - 1, 0) 
  WHERE id = rec_id;
END;
$$ LANGUAGE plpgsql;
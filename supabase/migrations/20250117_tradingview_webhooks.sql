-- Create table for storing TradingView webhook data
CREATE TABLE IF NOT EXISTS tradingview_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    action TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    volume BIGINT NOT NULL,
    text TEXT,
    webhook_time TIMESTAMPTZ NOT NULL,
    strategy TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    indicators JSONB,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tradingview_webhooks_symbol ON tradingview_webhooks(symbol);
CREATE INDEX idx_tradingview_webhooks_action ON tradingview_webhooks(action);
CREATE INDEX idx_tradingview_webhooks_webhook_time ON tradingview_webhooks(webhook_time);
CREATE INDEX idx_tradingview_webhooks_strategy ON tradingview_webhooks(strategy);
CREATE INDEX idx_tradingview_webhooks_created_at ON tradingview_webhooks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tradingview_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (Edge Functions)
CREATE POLICY "Service role can insert webhook data" 
    ON tradingview_webhooks 
    FOR INSERT 
    TO service_role 
    WITH CHECK (true);

CREATE POLICY "Service role can read webhook data" 
    ON tradingview_webhooks 
    FOR SELECT 
    TO service_role 
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_tradingview_webhooks_updated_at
    BEFORE UPDATE ON tradingview_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE tradingview_webhooks IS 'Stores webhook data from TradingView alerts';
COMMENT ON COLUMN tradingview_webhooks.symbol IS 'Trading symbol/ticker';
COMMENT ON COLUMN tradingview_webhooks.action IS 'Trading action (buy/sell)';
COMMENT ON COLUMN tradingview_webhooks.price IS 'Price at the time of signal';
COMMENT ON COLUMN tradingview_webhooks.volume IS 'Trading volume';
COMMENT ON COLUMN tradingview_webhooks.text IS 'Additional text from the alert';
COMMENT ON COLUMN tradingview_webhooks.webhook_time IS 'Time from TradingView webhook';
COMMENT ON COLUMN tradingview_webhooks.strategy IS 'Strategy name that triggered the alert';
COMMENT ON COLUMN tradingview_webhooks.timeframe IS 'Timeframe of the chart';
COMMENT ON COLUMN tradingview_webhooks.indicators IS 'JSON object containing indicator values';
COMMENT ON COLUMN tradingview_webhooks.raw_data IS 'Complete raw JSON data from webhook';
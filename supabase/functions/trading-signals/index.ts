import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignalRequest {
  symbol: string
  strategy: 'jesse_livermore' | 'larry_williams' | 'stan_weinstein'
  timeframe?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Authenticate user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Check subscription
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    // Check if user has access to the strategy
    const { symbol, strategy, timeframe = 'D' } = await req.json() as SignalRequest
    
    const { data: strategyData } = await supabaseClient
      .from('trading_strategies')
      .select('id, min_tier')
      .eq('type', strategy)
      .single()

    if (!strategyData) {
      throw new Error('Strategy not found')
    }

    // Verify subscription tier
    const hasAccess = await supabaseClient.rpc('check_subscription_access', {
      required_tier: strategyData.min_tier
    })

    if (!hasAccess) {
      throw new Error('Insufficient subscription tier for this strategy')
    }

    // Check if user is subscribed to the strategy
    const { data: subscription } = await supabaseClient
      .from('user_strategy_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('strategy_id', strategyData.id)
      .eq('is_active', true)
      .single()

    if (!subscription) {
      throw new Error('Not subscribed to this strategy')
    }

    // Fetch market data using the market-data function
    const marketDataResponse = await supabaseClient.functions.invoke('market-data', {
      body: {
        action: 'candles',
        symbol,
        params: {
          resolution: timeframe,
          from: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60), // 1 year
          to: Math.floor(Date.now() / 1000)
        }
      }
    })

    if (marketDataResponse.error) {
      throw new Error('Failed to fetch market data')
    }

    const candleData = marketDataResponse.data.data
    
    if (!candleData || candleData.s !== 'ok') {
      throw new Error('Invalid market data')
    }

    let signal: any

    switch (strategy) {
      case 'jesse_livermore':
        signal = calculateJesseLivermoreSignal(candleData)
        break
      case 'larry_williams':
        signal = calculateLarryWilliamsSignal(candleData)
        break
      case 'stan_weinstein':
        signal = calculateStanWeinsteinSignal(candleData)
        break
      default:
        throw new Error('Invalid strategy')
    }

    // Create recommendation if signal is strong
    if (signal.action !== 'hold' && signal.confidence >= 0.7) {
      const { data: recommendation } = await supabaseClient
        .from('recommendations')
        .insert({
          strategy_id: strategyData.id,
          user_id: user.id,
          symbol,
          action: signal.action,
          entry_price: signal.entry_price,
          target_price: signal.target_price,
          stop_loss: signal.stop_loss,
          confidence: signal.confidence,
          reasoning: signal.reasoning,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single()

      signal.recommendation_id = recommendation?.id
    }

    // Log activity
    await supabaseClient.rpc('log_activity', {
      action_type: 'trading_signal_generated',
      metadata: { symbol, strategy, signal: signal.action }
    })

    return new Response(
      JSON.stringify({ signal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Jesse Livermore Strategy - Trend Following with Pyramiding
function calculateJesseLivermoreSignal(data: any) {
  const closes = data.c
  const highs = data.h
  const lows = data.l
  const volumes = data.v
  
  if (!closes || closes.length < 50) {
    return { action: 'hold', confidence: 0, reasoning: 'Insufficient data' }
  }

  // Calculate trend using 20 and 50 day moving averages
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  
  const currentPrice = closes[closes.length - 1]
  const currentSMA20 = sma20[sma20.length - 1]
  const currentSMA50 = sma50[sma50.length - 1]
  
  // Calculate momentum
  const priceChange = (currentPrice - closes[closes.length - 20]) / closes[closes.length - 20]
  
  // Volume analysis
  const avgVolume = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
  const currentVolume = volumes[volumes.length - 1]
  const volumeRatio = currentVolume / avgVolume

  // Pivotal points detection
  const recentHigh = Math.max(...highs.slice(-20))
  const recentLow = Math.min(...lows.slice(-20))
  
  let action = 'hold'
  let confidence = 0
  let reasoning = ''
  
  // Buy signal
  if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50 && 
      priceChange > 0.05 && volumeRatio > 1.2 &&
      currentPrice > recentHigh * 0.98) {
    action = 'buy'
    confidence = Math.min(0.95, 0.7 + priceChange + (volumeRatio - 1) * 0.1)
    reasoning = 'Strong uptrend with volume confirmation and breakout'
  }
  // Sell signal
  else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50 &&
           priceChange < -0.05 && currentPrice < recentLow * 1.02) {
    action = 'sell'
    confidence = Math.min(0.95, 0.7 + Math.abs(priceChange) + (volumeRatio - 1) * 0.1)
    reasoning = 'Downtrend confirmed with breakdown below support'
  }
  
  const entry_price = currentPrice
  const stop_loss = action === 'buy' ? 
    currentPrice * 0.95 : // 5% stop loss for longs
    currentPrice * 1.05   // 5% stop loss for shorts
  const target_price = action === 'buy' ?
    currentPrice * 1.15 : // 15% target for longs
    currentPrice * 0.85   // 15% target for shorts

  return {
    action,
    confidence,
    reasoning,
    entry_price,
    stop_loss,
    target_price,
    indicators: {
      sma20: currentSMA20,
      sma50: currentSMA50,
      priceChange,
      volumeRatio
    }
  }
}

// Larry Williams Strategy - Short-term Momentum
function calculateLarryWilliamsSignal(data: any) {
  const closes = data.c
  const highs = data.h
  const lows = data.l
  
  if (!closes || closes.length < 20) {
    return { action: 'hold', confidence: 0, reasoning: 'Insufficient data' }
  }

  // Calculate Williams %R
  const williamsR = calculateWilliamsR(highs, lows, closes, 10)
  const currentWR = williamsR[williamsR.length - 1]
  
  // Calculate RSI
  const rsi = calculateRSI(closes, 14)
  const currentRSI = rsi[rsi.length - 1]
  
  // Calculate short-term momentum
  const momentum3 = (closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]
  const momentum5 = (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]
  
  const currentPrice = closes[closes.length - 1]
  
  let action = 'hold'
  let confidence = 0
  let reasoning = ''
  
  // Buy signal - Oversold bounce
  if (currentWR < -80 && currentRSI < 35 && momentum3 > 0) {
    action = 'buy'
    confidence = Math.min(0.9, 0.6 + (Math.abs(currentWR + 80) / 20) * 0.3)
    reasoning = 'Oversold bounce setup with positive momentum'
  }
  // Sell signal - Overbought reversal
  else if (currentWR > -20 && currentRSI > 65 && momentum3 < 0) {
    action = 'sell' 
    confidence = Math.min(0.9, 0.6 + (Math.abs(currentWR + 20) / 20) * 0.3)
    reasoning = 'Overbought reversal setup with negative momentum'
  }
  
  const entry_price = currentPrice
  const stop_loss = action === 'buy' ? 
    currentPrice * 0.97 : // 3% stop loss for short-term trades
    currentPrice * 1.03
  const target_price = action === 'buy' ?
    currentPrice * 1.05 : // 5% target for short-term trades
    currentPrice * 0.95

  return {
    action,
    confidence,
    reasoning,
    entry_price,
    stop_loss,
    target_price,
    indicators: {
      williamsR: currentWR,
      rsi: currentRSI,
      momentum3,
      momentum5
    }
  }
}

// Stan Weinstein Strategy - Stage Analysis
function calculateStanWeinsteinSignal(data: any) {
  const closes = data.c
  const volumes = data.v
  
  if (!closes || closes.length < 150) {
    return { action: 'hold', confidence: 0, reasoning: 'Insufficient data for stage analysis' }
  }

  // Calculate 30-week (150-day) moving average
  const sma150 = calculateSMA(closes, 150)
  const currentSMA150 = sma150[sma150.length - 1]
  
  // Calculate 10-week (50-day) moving average
  const sma50 = calculateSMA(closes, 50)
  const currentSMA50 = sma50[sma50.length - 1]
  
  const currentPrice = closes[closes.length - 1]
  
  // Determine trend of 150 MA
  const ma150Slope = (currentSMA150 - sma150[sma150.length - 10]) / sma150[sma150.length - 10]
  
  // Volume analysis
  const avgVolume = volumes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
  const recentVolume = volumes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10
  const volumeIncrease = recentVolume / avgVolume
  
  // Determine market stage
  let stage = 1 // Default to Stage 1 (Accumulation)
  
  if (currentPrice > currentSMA150 && ma150Slope > 0.02 && currentPrice > currentSMA50) {
    stage = 2 // Stage 2 (Advancing)
  } else if (currentPrice > currentSMA150 && ma150Slope < 0.01 && currentPrice < currentSMA50) {
    stage = 3 // Stage 3 (Distribution)
  } else if (currentPrice < currentSMA150 && ma150Slope < -0.02) {
    stage = 4 // Stage 4 (Declining)
  }
  
  let action = 'hold'
  let confidence = 0
  let reasoning = ''
  
  // Buy signal - Early Stage 2
  if (stage === 2 && currentPrice > currentSMA150 * 1.02 && volumeIncrease > 1.3) {
    action = 'buy'
    confidence = Math.min(0.95, 0.7 + ma150Slope * 5 + (volumeIncrease - 1) * 0.2)
    reasoning = 'Stage 2 breakout with volume confirmation'
  }
  // Sell signal - Stage 3 or 4
  else if ((stage === 3 || stage === 4) && currentPrice < currentSMA150 * 0.98) {
    action = 'sell'
    confidence = Math.min(0.9, 0.7 + Math.abs(ma150Slope) * 5)
    reasoning = `Stage ${stage} - Distribution/Decline phase`
  }
  
  const entry_price = currentPrice
  const stop_loss = action === 'buy' ? 
    Math.min(currentPrice * 0.92, currentSMA150 * 0.98) : // Stop below MA or 8%
    Math.max(currentPrice * 1.08, currentSMA150 * 1.02)   // Stop above MA or 8%
  const target_price = action === 'buy' ?
    currentPrice * 1.25 : // 25% target for long-term positions
    currentPrice * 0.75   // 25% target for short positions

  return {
    action,
    confidence,
    reasoning,
    entry_price,
    stop_loss,
    target_price,
    indicators: {
      stage,
      sma150: currentSMA150,
      sma50: currentSMA50,
      ma150Slope,
      volumeIncrease
    }
  }
}

// Helper functions
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  return sma
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  for (let i = period; i < gains.length; i++) {
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  
  return rsi
}

function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const williamsR: number[] = []
  
  for (let i = period - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1))
    const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1))
    const currentClose = closes[i]
    
    const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100
    williamsR.push(wr)
  }
  
  return williamsR
}
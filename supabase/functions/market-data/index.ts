// Import required modules for Deno
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketDataRequest {
  action: 'quote' | 'candles' | 'news' | 'profile' | 'indicators'
  symbol: string
  params?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Check user's subscription
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.subscription_status !== 'active') {
      throw new Error('Active subscription required')
    }

    const { action, symbol, params } = await req.json() as MarketDataRequest
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY')

    // Check cache first
    const cacheKey = `${action}_${symbol}_${JSON.stringify(params || {})}`
    const { data: cachedData } = await supabaseClient
      .from('market_data_cache')
      .select('data, expires_at')
      .eq('symbol', symbol)
      .eq('data_type', action)
      .single()

    if (cachedData && new Date(cachedData.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ data: cachedData.data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let finnhubUrl: string
    let cacheMinutes = 1 // Default cache time

    switch (action) {
      case 'quote':
        finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
        break
      
      case 'candles':
        const { resolution = 'D', from, to } = params || {}
        finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${finnhubApiKey}`
        cacheMinutes = 5
        break
      
      case 'news':
        const today = new Date()
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        finnhubUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}&token=${finnhubApiKey}`
        cacheMinutes = 60
        break
      
      case 'profile':
        finnhubUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
        cacheMinutes = 1440 // 24 hours
        break
      
      case 'indicators':
        // For indicators, we'll fetch candle data and calculate
        const indicatorParams = params || { resolution: 'D', indicator: 'sma', period: 20 }
        const endTime = Math.floor(Date.now() / 1000)
        const startTime = endTime - (365 * 24 * 60 * 60) // 1 year of data
        
        finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${indicatorParams.resolution}&from=${startTime}&to=${endTime}&token=${finnhubApiKey}`
        cacheMinutes = 15
        break
      
      default:
        throw new Error('Invalid action')
    }

    // Fetch from Finnhub
    const finnhubResponse = await fetch(finnhubUrl)
    if (!finnhubResponse.ok) {
      throw new Error(`Finnhub API error: ${finnhubResponse.status}`)
    }

    let data = await finnhubResponse.json()

    // Calculate indicators if needed
    if (action === 'indicators' && data.s === 'ok') {
      const { indicator = 'sma', period = 20 } = params || {}
      const closePrices = data.c || []
      
      switch (indicator) {
        case 'sma':
          data = calculateSMA(closePrices, period)
          break
        case 'ema':
          data = calculateEMA(closePrices, period)
          break
        case 'rsi':
          data = calculateRSI(closePrices, period)
          break
        case 'macd':
          data = calculateMACD(closePrices)
          break
        case 'bollinger':
          data = calculateBollingerBands(closePrices, period)
          break
        case 'williams':
          data = calculateWilliamsR(data.h || [], data.l || [], closePrices, period)
          break
      }
    }

    // Cache the data
    const expiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000)
    await supabaseClient
      .from('market_data_cache')
      .upsert({
        symbol,
        data_type: action,
        data,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })

    // Log activity
    await supabaseClient.rpc('log_activity', {
      action_type: `market_data_${action}`,
      metadata: { symbol, tier: profile.subscription_tier }
    })

    return new Response(
      JSON.stringify({ data, cached: false }),
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

// Technical indicator calculations
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  return sma
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  // Start with SMA
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  ema.push(firstSMA)
  
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }
  return ema
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

function calculateMACD(prices: number[]): { macd: number[], signal: number[], histogram: number[] } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  
  const macd: number[] = []
  for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
    macd.push(ema12[i] - ema26[i])
  }
  
  const signal = calculateEMA(macd, 9)
  const histogram: number[] = []
  
  for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
    histogram.push(macd[i] - signal[i])
  }
  
  return { macd, signal, histogram }
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number[],
  middle: number[],
  lower: number[]
} {
  const middle = calculateSMA(prices, period)
  const upper: number[] = []
  const lower: number[] = []
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1)
    const mean = middle[i - period + 1]
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period
    const std = Math.sqrt(variance)
    
    upper.push(mean + stdDev * std)
    lower.push(mean - stdDev * std)
  }
  
  return { upper, middle, lower }
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
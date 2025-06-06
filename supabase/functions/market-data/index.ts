import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { action, symbol, params } = await req.json() as MarketDataRequest
    
    // Get Finnhub API key from environment or use default
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    let data: any = null
    
    switch (action) {
      case 'quote': {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
        )
        data = await response.json()
        break
      }
      
      case 'candles': {
        const { resolution = 'D', from, to } = params || {}
        const response = await fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${finnhubApiKey}`
        )
        data = await response.json()
        break
      }
      
      case 'news': {
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - 7)
        const from = fromDate.toISOString().split('T')[0]
        const to = new Date().toISOString().split('T')[0]
        
        const response = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhubApiKey}`
        )
        data = await response.json()
        break
      }
      
      case 'profile': {
        const response = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
        )
        data = await response.json()
        break
      }
      
      case 'indicators': {
        // Get quote data first
        const quoteResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
        )
        const quote = await quoteResponse.json()
        
        // Get historical data for indicators
        const to = Math.floor(Date.now() / 1000)
        const from = to - (365 * 24 * 60 * 60) // 1 year
        const candleResponse = await fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${finnhubApiKey}`
        )
        const candles = await candleResponse.json()
        
        if (candles.s === 'ok' && candles.c) {
          const closes = candles.c
          
          // Calculate simple indicators
          const sma20 = calculateSMA(closes, 20)
          const sma50 = calculateSMA(closes, 50)
          const rsi = calculateRSI(closes, 14)
          
          data = {
            current_price: quote.c,
            sma20: sma20[sma20.length - 1],
            sma50: sma50[sma50.length - 1],
            rsi: rsi[rsi.length - 1],
            volume: candles.v[candles.v.length - 1]
          }
        }
        break
      }
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    return new Response(
      JSON.stringify({ data, cached: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

// Helper functions
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  return sma
}

function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = []
  const changes: number[] = []
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  
  for (let i = period; i < changes.length; i++) {
    const gains = changes.slice(i - period, i).filter(c => c > 0)
    const losses = changes.slice(i - period, i).filter(c => c < 0)
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0)) / period : 0
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  
  return rsi
}
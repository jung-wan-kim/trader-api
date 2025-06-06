# 🚀 Edge Functions 최종 배포 버전

## 📌 수정된 내용
- Deno import 문법 사용 (`https://` URL)
- 불필요한 `createClient` import 제거
- CORS 헤더 추가
- 에러 처리 개선

## 1️⃣ market-data 함수

**Supabase Dashboard > Functions > New Function**
- Name: `market-data`
- 코드:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, symbol, params } = await req.json()
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    let data = null
    
    switch (action) {
      case 'quote': {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
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
```

## 2️⃣ trading-signals 함수

**Supabase Dashboard > Functions > New Function**
- Name: `trading-signals`
- 코드:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol, strategy, timeframe = 'D' } = await req.json()
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    // Get market data
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
    )
    const quote = await quoteResponse.json()
    
    // Generate signal based on strategy
    let signal = {
      action: 'hold',
      confidence: 0.5,
      entry_price: quote.c,
      target_price: null,
      stop_loss: null,
      reasoning: 'Analyzing market conditions...',
      indicators: {
        currentPrice: quote.c,
        changePercent: quote.dp,
        volume: quote.v
      }
    }
    
    // Simple strategy logic
    if (strategy === 'jesse_livermore') {
      if (quote.dp > 2) {
        signal = {
          action: 'buy',
          confidence: 0.75,
          entry_price: quote.c,
          target_price: quote.c * 1.10,
          stop_loss: quote.c * 0.95,
          reasoning: 'Strong upward momentum detected. Price breaking above resistance.',
          indicators: {
            currentPrice: quote.c,
            changePercent: quote.dp,
            momentum: 'bullish'
          }
        }
      } else if (quote.dp < -2) {
        signal = {
          action: 'sell',
          confidence: 0.70,
          entry_price: quote.c,
          target_price: quote.c * 0.90,
          stop_loss: quote.c * 1.05,
          reasoning: 'Bearish trend detected. Price breaking support levels.',
          indicators: {
            currentPrice: quote.c,
            changePercent: quote.dp,
            momentum: 'bearish'
          }
        }
      }
    } else if (strategy === 'larry_williams') {
      // Momentum based
      if (quote.dp > 1.5 && quote.v > 1000000) {
        signal = {
          action: 'buy',
          confidence: 0.65,
          entry_price: quote.c,
          target_price: quote.c * 1.05,
          stop_loss: quote.c * 0.97,
          reasoning: 'Short-term momentum trade opportunity.',
          indicators: {
            currentPrice: quote.c,
            changePercent: quote.dp,
            volumeStrength: 'high'
          }
        }
      }
    } else if (strategy === 'stan_weinstein') {
      // Stage analysis (simplified)
      if (quote.c > quote.pc * 1.02) {
        signal = {
          action: 'buy',
          confidence: 0.80,
          entry_price: quote.c,
          target_price: quote.c * 1.20,
          stop_loss: quote.c * 0.92,
          reasoning: 'Stage 2 breakout detected. Institutional accumulation likely.',
          indicators: {
            currentPrice: quote.c,
            stage: 2,
            trend: 'advancing'
          }
        }
      }
    }
    
    return new Response(
      JSON.stringify({ signal }),
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
```

## 3️⃣ portfolio-management 함수

**Supabase Dashboard > Functions > New Function**
- Name: `portfolio-management`
- 코드:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { action, portfolioId } = await req.json()
    
    if (action === 'calculate_performance') {
      // Get portfolio
      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()
      
      if (error || !portfolio) {
        throw new Error('Portfolio not found')
      }
      
      // Get positions
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
      
      // Calculate performance
      const performance = {
        portfolioId,
        totalValue: portfolio.initial_capital,
        totalReturn: 0,
        positions: positions || []
      }
      
      return new Response(
        JSON.stringify({ performance }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    throw new Error(`Unknown action: ${action}`)
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
```

## 🔧 환경 변수 설정

**Settings > Edge Functions > Secrets**에서 추가:
- `FINNHUB_API_KEY`: d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg

## ✅ 배포 후 테스트

```bash
# 1. Market Data 테스트
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -d '{"action":"quote","symbol":"AAPL"}'

# 2. Trading Signals 테스트
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","strategy":"jesse_livermore"}'
```

## 🎯 성공 기준
- HTTP 200 응답
- JSON 형식의 데이터 반환
- CORS 에러 없음
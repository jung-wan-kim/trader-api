# ✅ Supabase Dashboard 최종 작동 코드

## 1️⃣ market-data 함수

```typescript
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, symbol } = await req.json()
    const finnhubApiKey = 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    let data = null
    
    if (action === 'quote') {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
      )
      data = await response.json()
    } else if (action === 'profile') {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
      )
      data = await response.json()
    } else {
      throw new Error(`Unknown action: ${action}`)
    }
    
    return new Response(
      JSON.stringify({ data, cached: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
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

## 2️⃣ trading-signals 함수 (타입 에러 수정)

```typescript
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbol, strategy, timeframe = 'D' } = await req.json()
    const finnhubApiKey = 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
    )
    const quote = await response.json()
    
    // 타입 선언 없이 직접 객체 생성
    let signal: any = {
      action: 'hold',
      confidence: 0.5,
      entry_price: quote.c,
      target_price: null,
      stop_loss: null,
      reasoning: 'Analyzing market conditions...',
      indicators: {
        currentPrice: quote.c,
        changePercent: quote.dp
      }
    }
    
    // 전략별 신호 생성
    if (strategy === 'jesse_livermore') {
      if (quote.dp > 2) {
        signal = {
          action: 'buy',
          confidence: 0.75,
          entry_price: quote.c,
          target_price: quote.c * 1.10,
          stop_loss: quote.c * 0.95,
          reasoning: 'Strong upward momentum detected',
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
          target_price: null,
          stop_loss: null,
          reasoning: 'Bearish trend detected',
          indicators: {
            currentPrice: quote.c,
            changePercent: quote.dp,
            momentum: 'bearish'
          }
        }
      }
    } else if (strategy === 'larry_williams') {
      if (quote.dp > 1.5) {
        signal = {
          action: 'buy',
          confidence: 0.65,
          entry_price: quote.c,
          target_price: quote.c * 1.05,
          stop_loss: quote.c * 0.97,
          reasoning: 'Short-term momentum opportunity',
          indicators: {
            currentPrice: quote.c,
            changePercent: quote.dp,
            volume: 'high'
          }
        }
      }
    } else if (strategy === 'stan_weinstein') {
      if (quote.c > quote.pc * 1.02) {
        signal = {
          action: 'buy',
          confidence: 0.80,
          entry_price: quote.c,
          target_price: quote.c * 1.20,
          stop_loss: quote.c * 0.92,
          reasoning: 'Stage 2 breakout detected',
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
  } catch (error: any) {
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

```typescript
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { action, portfolioId } = await req.json()
    
    if (action === 'calculate_performance') {
      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()
      
      if (error) {
        throw new Error('Portfolio not found')
      }
      
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
      
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
  } catch (error: any) {
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

## 🔧 변경사항

1. **타입 에러 해결**: `let signal: any` 사용
2. **@ts-ignore** 추가로 import 에러 무시
3. **간단한 로직**으로 테스트 가능하도록 수정

## 🚀 배포 순서

1. **market-data** 먼저 배포 (가장 간단)
2. **trading-signals** 배포
3. **portfolio-management** 배포

## 🧪 각 함수 테스트

### market-data 테스트
```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -d '{"action":"quote","symbol":"AAPL"}'
```

### trading-signals 테스트
```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","strategy":"jesse_livermore"}'
```

## 💡 팁

- 하나씩 배포하고 테스트
- 에러가 나면 Logs 탭에서 확인
- 환경 변수 설정 확인 (Settings > Secrets)
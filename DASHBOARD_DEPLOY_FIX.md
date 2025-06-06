# 🔧 Supabase Dashboard 배포 에러 해결

## 🚨 문제: Dashboard에서도 import 에러 발생

최신 Deno 버전과 import 경로 변경으로 인한 문제입니다.

## ✅ 해결된 코드 (복사해서 사용하세요)

### 1️⃣ market-data 함수

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

### 2️⃣ trading-signals 함수

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
    
    let signal = {
      action: 'hold' as const,
      confidence: 0.5,
      entry_price: quote.c,
      target_price: null as number | null,
      stop_loss: null as number | null,
      reasoning: 'Analyzing...',
      indicators: {
        currentPrice: quote.c,
        changePercent: quote.dp
      }
    }
    
    if (strategy === 'jesse_livermore' && quote.dp > 2) {
      signal = {
        action: 'buy',
        confidence: 0.75,
        entry_price: quote.c,
        target_price: quote.c * 1.10,
        stop_loss: quote.c * 0.95,
        reasoning: 'Strong upward momentum',
        indicators: {
          currentPrice: quote.c,
          changePercent: quote.dp,
          momentum: 'bullish'
        }
      }
    } else if (strategy === 'jesse_livermore' && quote.dp < -2) {
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

### 3️⃣ portfolio-management 함수

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

## 🔑 변경사항

1. **Deno 버전 업데이트**: `0.168.0` → `0.177.0`
2. **@ts-ignore 추가**: TypeScript 검사 무시
3. **타입 명시**: `req: Request`, `error: any`
4. **Supabase 버전 명시**: `@2.39.0`

## 🚀 배포 방법

1. Supabase Dashboard > Functions
2. "New Function" 클릭
3. 위 코드 복사/붙여넣기
4. "Deploy" 클릭

## 🧪 테스트

```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -d '{"action":"quote","symbol":"AAPL"}'
```

이제 에러 없이 배포될 것입니다!
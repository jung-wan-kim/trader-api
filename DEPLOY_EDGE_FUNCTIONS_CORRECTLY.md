# ✅ Edge Functions 올바른 배포 방법

## 🎯 문제 원인
- Edge Functions는 **Deno 런타임**을 사용
- 우리 코드는 Deno import 문법 사용 (`https://...`)
- Node.js/TypeScript 환경에서는 이를 인식하지 못함

## 📋 즉시 배포하는 방법

### 방법 1: Supabase Dashboard에서 직접 생성 (추천) ⭐

1. **[Functions 페이지 열기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**

2. **"New Function"** 클릭

3. **market-data** 함수 생성:
   - Name: `market-data`
   - 아래 코드 전체 복사/붙여넣기:

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
    const { action, symbol } = await req.json()
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    let url = ''
    switch (action) {
      case 'quote':
        url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
        break
      case 'profile':
        url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    const response = await fetch(url)
    const data = await response.json()
    
    return new Response(
      JSON.stringify({ data, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

4. **trading-signals** 함수 생성:
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
    const { symbol, strategy, timeframe } = await req.json()
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    // 시장 데이터 가져오기
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
    )
    const quote = await quoteResponse.json()
    
    // 간단한 신호 생성 로직
    let signal = {
      action: 'hold',
      confidence: 0.5,
      entry_price: quote.c,
      target_price: null,
      stop_loss: null,
      reasoning: '',
      indicators: {
        price: quote.c,
        change: quote.d,
        changePercent: quote.dp
      }
    }
    
    // 전략별 신호 생성
    if (strategy === 'jesse_livermore') {
      if (quote.dp > 2) {
        signal.action = 'buy'
        signal.confidence = 0.75
        signal.target_price = quote.c * 1.1
        signal.stop_loss = quote.c * 0.95
        signal.reasoning = '강한 상승 모멘텀 감지'
      } else if (quote.dp < -2) {
        signal.action = 'sell'
        signal.confidence = 0.75
        signal.reasoning = '하락 추세 감지'
      }
    }
    
    return new Response(
      JSON.stringify({ signal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

5. **portfolio-management** 함수 생성:
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
      // 포트폴리오 조회
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()
      
      if (!portfolio) {
        throw new Error('Portfolio not found')
      }
      
      // 포지션 조회
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
      
      // 성과 계산
      const performance = {
        totalValue: portfolio.initial_capital,
        totalReturn: 0,
        positions: positions || []
      }
      
      return new Response(
        JSON.stringify({ performance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

### 방법 2: Supabase CLI 사용

```bash
# 1. 별도 디렉토리 생성
mkdir ~/supabase-functions
cd ~/supabase-functions

# 2. Supabase 프로젝트 초기화
npx supabase init

# 3. 로그인 및 링크
npx supabase login
npx supabase link --project-ref lgebgddeerpxdjvtqvoi

# 4. 함수 생성
npx supabase functions new market-data
npx supabase functions new trading-signals
npx supabase functions new portfolio-management

# 5. 각 함수 디렉토리에 위 코드 복사

# 6. 배포
npx supabase functions deploy market-data
npx supabase functions deploy trading-signals
npx supabase functions deploy portfolio-management
```

## 🧪 테스트

배포 후 테스트:
```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"action":"quote","symbol":"AAPL"}'
```

## 💡 중요
- Edge Functions는 **Deno 런타임**이므로 Node.js 모듈을 사용할 수 없음
- `https://` URL로 직접 import 해야 함
- TypeScript는 자동 지원됨
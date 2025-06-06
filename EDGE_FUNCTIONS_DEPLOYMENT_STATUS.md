# 🚨 Edge Functions 배포 상태 확인

## 현재 상황

Edge Functions 호출 시 401 Unauthorized 에러가 발생하고 있습니다.

## 확인 필요 사항

### 1. Edge Functions 배포 확인
👉 **[Functions 페이지](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**

다음 3개의 함수가 배포되어 있는지 확인:
- ✅ `market-data`
- ✅ `trading-signals`
- ✅ `portfolio-management`

### 2. 배포 상태 확인 방법

각 함수 옆에 상태 표시:
- 🟢 **Active**: 정상 배포됨
- 🔴 **Failed**: 배포 실패
- 🟡 **Deploying**: 배포 중

### 3. 만약 배포되지 않았다면

#### Option A: Dashboard에서 직접 배포
1. **"New Function"** 클릭
2. 함수 이름 입력 (예: `market-data`)
3. 아래 코드 복사/붙여넣기:

```typescript
// market-data 함수 코드
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, symbol, params } = await req.json()
    
    // Finnhub API 키
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY') || 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    let data = null
    
    switch (action) {
      case 'quote':
        const quoteResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
        )
        data = await quoteResponse.json()
        break
        
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

#### Option B: Supabase CLI로 배포

```bash
# 1. Supabase CLI 설치
npm install -g supabase

# 2. 로그인
supabase login

# 3. 프로젝트 링크
supabase link --project-ref lgebgddeerpxdjvtqvoi

# 4. 함수 배포
supabase functions deploy market-data
supabase functions deploy trading-signals
supabase functions deploy portfolio-management

# 5. 환경 변수 설정
supabase secrets set FINNHUB_API_KEY=d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
```

## 테스트 방법

배포 완료 후:

```bash
# 간단한 테스트
curl -i -X POST \
  https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE" \
  -d '{"action":"quote","symbol":"AAPL"}'
```

성공 응답 예시:
```json
{
  "data": {
    "c": 150.25,
    "d": 1.5,
    "dp": 1.01,
    "h": 151.00,
    "l": 149.50,
    "o": 149.75,
    "pc": 148.75
  },
  "cached": false
}
```
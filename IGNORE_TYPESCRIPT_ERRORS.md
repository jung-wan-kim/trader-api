# ⚠️ TypeScript 에러는 무시하세요!

## 🔴 중요: 로컬 에러는 정상입니다

```
Cannot find module 'https://deno.land/std@0.168.0/http/server.ts'
```

이 에러가 나는 이유:
- **로컬 환경**: Node.js + TypeScript
- **Edge Functions**: Deno 런타임
- 서로 다른 모듈 시스템 사용

## ✅ 해결 방법

### 방법 1: Supabase Dashboard에서 직접 생성 (권장) ⭐

1. **[Functions 페이지 열기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**
2. **"New Function"** 클릭
3. 함수 이름 입력
4. **에디터에 직접 코드 입력** (복사/붙여넣기)
5. **Deploy** 클릭

### 방법 2: 별도 Deno 프로젝트 생성

```bash
# 새 디렉토리 생성 (현재 프로젝트 밖)
cd ~
mkdir supabase-edge-functions
cd supabase-edge-functions

# Supabase CLI로 초기화
npx supabase init

# 함수 생성
npx supabase functions new market-data

# 생성된 파일 편집
# ~/supabase-edge-functions/functions/market-data/index.ts
```

### 방법 3: TypeScript 설정 수정 (비권장)

`tsconfig.json`에 추가:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowJs": true,
    "lib": ["ES2021"],
    "types": []
  },
  "exclude": [
    "supabase/functions/**/*"  // Edge Functions 제외
  ]
}
```

## 🚀 가장 빠른 방법

**Dashboard에서 직접 생성하세요!**

1. 여기 클릭 👉 **[Functions 생성](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**

2. 다음 코드 복사/붙여넣기:

### market-data 함수
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
    const finnhubApiKey = 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    if (action === 'quote') {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
      )
      const data = await response.json()
      
      return new Response(
        JSON.stringify({ data, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    throw new Error('Unknown action')
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

## 💡 핵심 포인트

- **로컬 TypeScript 에러 = 무시**
- **Supabase Dashboard = 정상 작동**
- **Deno ≠ Node.js**

## 🧪 배포 확인

```bash
# 배포 후 테스트
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -d '{"action":"quote","symbol":"AAPL"}'
```

성공 응답:
```json
{
  "data": {
    "c": 150.25,
    "d": 1.5,
    "dp": 1.01
  },
  "cached": false
}
```
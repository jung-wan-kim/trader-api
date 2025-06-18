# TradingView Webhook 설정 가이드

## 현재 상황

TradingView는 커스텀 헤더를 지원하지 않고, Supabase Edge Functions는 기본적으로 JWT 검증이 필요합니다.

## 해결 방법

### 방법 1: Supabase 대시보드에서 JWT 검증 비활성화 (권장)

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `trader-api`
3. Edge Functions → `tradingview-webhook` 선택
4. Settings → "Require JWT Verification" 체크 해제
5. Save

### 방법 2: 프록시 서버 사용

Express.js 프록시 서버 예제:

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const SUPABASE_URL = 'https://lgebgddeerpxdjvtqvoi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';
const WEBHOOK_SECRET = 'flwkbf1922jb4';

app.post('/webhook/:secret', async (req, res) => {
  // 시크릿 검증
  if (req.params.secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Supabase Edge Function으로 전달
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/tradingview-webhook?secret=${WEBHOOK_SECRET}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to forward webhook' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
```

### 방법 3: Vercel Edge Function 사용

`api/tradingview-webhook.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.query;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      `https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/tradingview-webhook?secret=${secret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to forward webhook' });
  }
}
```

## 현재 작동하는 테스트 명령어

JWT 토큰과 함께 사용:

```bash
curl -X POST 'https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/tradingview-webhook?secret=flwkbf1922jb4' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "time": "2025-01-18 10:30:00",
    "strategy": "jesse_livermore",
    "timeframe": "1h",
    "indicators": {
      "macd": 0.5,
      "wr": -20,
      "rsi": 65
    }
  }'
```

## 데이터베이스 확인

```sql
-- 최근 웹훅 데이터 확인
SELECT * FROM tradingview_webhooks 
ORDER BY created_at DESC 
LIMIT 10;

-- 특정 전략의 데이터 확인
SELECT * FROM tradingview_webhooks 
WHERE payload->>'strategy' = 'jesse_livermore'
ORDER BY created_at DESC;
```

## 배포된 Edge Functions

1. `tradingview-webhook` - 메인 웹훅 핸들러
2. `tradingview-webhook-public` - JWT 없이 사용하려고 시도한 버전 (현재도 JWT 필요)

## 환경 변수

- `TRADINGVIEW_WEBHOOK_SECRET`: `flwkbf1922jb4` (설정 필요)
- `SUPABASE_URL`: 자동 설정됨
- `SUPABASE_SERVICE_ROLE_KEY`: 자동 설정됨
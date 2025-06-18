# TradingView Webhook Edge Function

TradingView 알림을 받아 Supabase 데이터베이스에 저장하는 Edge Function

## 빠른 시작

### 1. 데이터베이스 설정

```bash
# SQL 마이그레이션 실행
supabase db reset
```

### 2. 환경 변수 설정

```bash
# 웹훅 시크릿 설정 (강력한 랜덤 문자열 사용)
supabase secrets set TRADINGVIEW_WEBHOOK_SECRET=your-strong-secret-token-here
```

### 3. 함수 배포

```bash
supabase functions deploy tradingview-webhook
```

## TradingView 설정

### 웹훅 URL 형식

TradingView는 커스텀 헤더를 지원하지 않으므로, URL 파라미터로 인증합니다:

```
https://YOUR-PROJECT.supabase.co/functions/v1/tradingview-webhook?secret=your-strong-secret-token-here
```

### TradingView Alert 설정

1. TradingView에서 Alert 생성 또는 수정
2. "Notifications" 탭에서 "Webhook URL" 활성화
3. 위의 웹훅 URL 입력 (secret 파라미터 포함)
4. "Message" 필드에 다음 JSON 템플릿 입력:

```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "volume": {{volume}},
  "text": "{{strategy.order.comment}}",
  "time": "{{timenow}}",
  "strategy": "your_strategy_name",
  "timeframe": "{{interval}}",
  "indicators": {
    "macd": {{plot_0}},
    "wr": {{plot_1}},
    "rsi": {{plot_2}}
  }
}
```

### TradingView 플레이스홀더

- `{{ticker}}`: 심볼
- `{{close}}`: 현재가
- `{{volume}}`: 거래량
- `{{timenow}}`: 현재 시간
- `{{interval}}`: 차트 시간대
- `{{strategy.order.action}}`: 전략 액션 (buy/sell)
- `{{strategy.order.comment}}`: 전략 코멘트
- `{{plot_0}}`, `{{plot_1}}`, etc.: 인디케이터 값

## 테스트

### 로컬 테스트

```bash
# Supabase 로컬 환경에서 테스트
supabase functions serve tradingview-webhook --env-file .env.local

# 테스트 요청
curl -X POST \
  'http://localhost:54321/functions/v1/tradingview-webhook?secret=your-secret-token' \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "time": "2025-01-17 10:30:00",
    "strategy": "jesse_livermore",
    "timeframe": "1h",
    "indicators": {
      "macd": 0.5,
      "wr": -20
    }
  }'
```

### 프로덕션 테스트

```bash
curl -X POST \
  'https://YOUR-PROJECT.supabase.co/functions/v1/tradingview-webhook?secret=your-secret-token' \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "time": "2025-01-17 10:30:00",
    "strategy": "test",
    "timeframe": "1h",
    "indicators": {}
  }'
```

## 보안

- ✅ URL 파라미터 기반 시크릿 인증
- ✅ 강력한 랜덤 시크릿 토큰 사용
- ✅ 웹훅 URL을 비공개로 유지
- ✅ 모든 요청에서 시크릿 검증
- ✅ HTTPS 전송으로 암호화

## 데이터베이스 스키마

`tradingview_webhooks` 테이블:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | 기본 키 |
| symbol | text | 주식 심볼 |
| action | text | 액션 (buy/sell) |
| price | numeric | 신호 발생 시 가격 |
| volume | bigint | 거래량 |
| text | text | 알림 메시지 |
| webhook_time | timestamptz | TradingView 타임스탬프 |
| strategy | text | 전략 이름 |
| timeframe | text | 차트 시간대 |
| indicators | jsonb | 인디케이터 값 |
| raw_data | jsonb | 원본 웹훅 데이터 |
| created_at | timestamptz | 생성 시간 |

## 모니터링

### 로그 확인

```bash
# 실시간 로그
supabase functions logs tradingview-webhook --tail

# 최근 100개 로그
supabase functions logs tradingview-webhook --limit 100
```

### 데이터 확인

```sql
-- 최근 웹훅 확인
SELECT * FROM tradingview_webhooks 
ORDER BY created_at DESC 
LIMIT 10;

-- 특정 전략의 신호 확인
SELECT * FROM tradingview_webhooks 
WHERE strategy = 'jesse_livermore' 
AND action = 'buy'
ORDER BY created_at DESC;
```

## 문제 해결

### 401 Unauthorized
- URL에 올바른 secret 파라미터가 포함되어 있는지 확인
- 환경 변수 `TRADINGVIEW_WEBHOOK_SECRET`가 설정되어 있는지 확인

### 400 Bad Request
- JSON 형식이 올바른지 확인
- 모든 필수 필드가 포함되어 있는지 확인
- TradingView 플레이스홀더가 올바르게 사용되었는지 확인

### 500 Internal Server Error
- Supabase Edge Function 로그 확인
- 데이터베이스 연결 상태 확인
- 환경 변수 설정 확인

## 추가 기능 (옵션)

### Rate Limiting
과도한 요청을 방지하려면 `tradingview-webhook-secure` 버전 사용

### 타임스탬프 검증
5분 이상 오래된 웹훅을 거부하려면 보안 버전 사용

### 고급 검증
더 엄격한 데이터 검증이 필요한 경우 보안 버전 사용
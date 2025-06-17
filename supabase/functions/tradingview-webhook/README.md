# TradingView Webhook Edge Function

TradingView 알림을 받아 Supabase 데이터베이스에 저장하는 Edge Function

## 빠른 시작

### 1. 데이터베이스 설정

```bash
# SQL 마이그레이션 실행
supabase db reset
```

### 2. 함수 배포

```bash
# 기본 버전
supabase functions deploy tradingview-webhook

# 보안 버전 (권장)
supabase functions deploy tradingview-webhook-secure
```

### 3. 테스트

```bash
# 테스트 웹훅 전송
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/tradingview-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "time": "2025-01-17 10:30:00",
    "strategy": "Test",
    "timeframe": "1h"
  }'
```

## 기능

- ✅ TradingView 웹훅 데이터 수신
- ✅ 데이터 검증 및 정제
- ✅ Supabase 데이터베이스 저장
- ✅ 에러 핸들링 및 로깅
- ✅ CORS 지원

## 보안 버전 추가 기능

- 🔒 웹훅 시크릿 검증
- 🚦 Rate Limiting (분당 100 요청)
- ⏰ 타임스탬프 검증 (5분 이내)
- 🛡️ 향상된 데이터 검증

## 환경 변수

- `SUPABASE_URL`: 자동 설정
- `SUPABASE_SERVICE_ROLE_KEY`: 자동 설정
- `TRADINGVIEW_WEBHOOK_SECRET`: (선택) 웹훅 보안용

## 로그 확인

```bash
supabase functions logs tradingview-webhook --tail
```
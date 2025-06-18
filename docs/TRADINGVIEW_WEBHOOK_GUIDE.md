# TradingView Webhook Integration Guide

이 가이드는 TradingView 알림을 Supabase Edge Function으로 연동하는 방법을 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [Edge Function 배포](#edge-function-배포)
5. [TradingView 설정](#tradingview-설정)
6. [테스트](#테스트)
7. [보안 설정](#보안-설정)
8. [문제 해결](#문제-해결)

## 개요

이 시스템은 TradingView의 알림(Alert)을 웹훅으로 받아 Supabase 데이터베이스에 저장합니다.

### 지원하는 데이터 형식

```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "volume": {{volume}},
  "text": "매수 : {{plot(\"W%R 매수 신호\")}}",
  "time": "{{time}}",
  "strategy": "Your Strategy Name",
  "timeframe": "{{interval}}",
  "indicators": {
    "macd": {{plot_1}},
    "wr": {{plot("W%R 매수 신호")}}
  }
}
```

## 사전 준비사항

- Supabase 프로젝트
- Supabase CLI 설치
- TradingView Pro 이상 계정 (웹훅 기능 사용)

## 데이터베이스 설정

### 1. 테이블 생성

Supabase Dashboard의 SQL Editor에서 다음 마이그레이션 파일을 실행:

```sql
-- supabase/migrations/20250117_tradingview_webhooks.sql 파일 내용 실행
```

### 2. 테이블 구조

- `id`: UUID (Primary Key)
- `symbol`: 종목 코드
- `action`: 매매 액션 (buy/sell/hold/close)
- `price`: 신호 발생 시점 가격
- `volume`: 거래량
- `text`: 추가 텍스트 정보
- `webhook_time`: TradingView에서 보낸 시간
- `strategy`: 전략 이름
- `timeframe`: 차트 타임프레임
- `indicators`: 지표 값들 (JSON)
- `raw_data`: 원본 웹훅 데이터 (JSON)
- `created_at`: 생성 시간
- `updated_at`: 수정 시간

## Edge Function 배포

### 1. 환경 변수 설정

```bash
# 웹훅 시크릿 설정 (필수)
supabase secrets set TRADINGVIEW_WEBHOOK_SECRET="your-secret-key-here"
```

### 2. Edge Function 배포

```bash
# Edge Function 배포
supabase functions deploy tradingview-webhook

# 환경 변수는 자동으로 설정됨 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

### 3. 배포 확인

```bash
# 배포된 함수 목록 확인
supabase functions list

# 로그 확인
supabase functions logs tradingview-webhook
```

### 4. 웹훅 URL

배포 후 웹훅 URL은 다음과 같습니다:

```
https://[YOUR-PROJECT-REF].supabase.co/functions/v1/tradingview-webhook?secret=your-secret-key-here
```

⚠️ **중요**: URL에 반드시 `?secret=your-secret-key-here` 파라미터를 포함해야 합니다.

## TradingView 설정

### 1. 알림(Alert) 생성

1. TradingView 차트에서 알림 생성
2. "Webhook URL" 옵션 활성화
3. URL 입력: `https://[YOUR-PROJECT-REF].supabase.co/functions/v1/tradingview-webhook?secret=your-secret-key-here`

### 2. 메시지 템플릿 설정

알림 메시지에 다음 JSON 템플릿 입력:

```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "volume": {{volume}},
  "text": "{{strategy.order.comment}}",
  "time": "{{time}}",
  "strategy": "My Strategy Name",
  "timeframe": "{{interval}}",
  "indicators": {
    "macd": {{plot("MACD")}},
    "rsi": {{plot("RSI")}},
    "ema": {{plot("EMA")}}
  }
}
```

### 3. 보안 설정 (URL 파라미터 방식)

TradingView는 커스텀 헤더를 지원하지 않으므로, URL 파라미터로 인증합니다:

```
https://[YOUR-PROJECT-REF].supabase.co/functions/v1/tradingview-webhook?secret=your-secret-key-here
```

1. Supabase에서 시크릿 설정:
   ```bash
   supabase secrets set TRADINGVIEW_WEBHOOK_SECRET="your-secret-key-here"
   ```

2. TradingView 웹훅 URL에 secret 파라미터 추가:
   - Webhook URL: `https://[YOUR-PROJECT-REF].supabase.co/functions/v1/tradingview-webhook?secret=your-secret-key-here`

## 테스트

### 1. cURL을 사용한 테스트

```bash
# URL 파라미터 방식 테스트
curl -X POST 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/tradingview-webhook?secret=your-secret-key-here' \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "text": "Test buy signal",
    "time": "'$(date -u +"%Y-%m-%d %H:%M:%S")'",
    "strategy": "Test Strategy",
    "timeframe": "1h",
    "indicators": {
      "macd": 0.5,
      "rsi": 65
    }
  }'

# 로컬 테스트
supabase functions serve tradingview-webhook --env-file .env.local

curl -X POST 'http://localhost:54321/functions/v1/tradingview-webhook?secret=your-secret-key-here' \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "buy",
    "price": 150.25,
    "volume": 1000000,
    "text": "Test buy signal",
    "time": "2025-01-17 10:30:00",
    "strategy": "Test Strategy",
    "timeframe": "1h",
    "indicators": {}
  }'
```

### 2. 데이터 확인

Supabase Dashboard의 Table Editor에서 `tradingview_webhooks` 테이블 확인

### 3. 로그 모니터링

```bash
# 실시간 로그 확인
supabase functions logs tradingview-webhook --tail
```

## 보안 설정

### 1. 웹훅 시크릿 (URL 파라미터)

- 환경 변수 `TRADINGVIEW_WEBHOOK_SECRET` 설정
- TradingView 웹훅 URL에 `?secret=your-secret-key-here` 파라미터 추가
- 모든 요청에서 secret 파라미터 검증

### 2. Rate Limiting

- IP당 분당 100개 요청으로 제한 (보안 버전)
- 초과 시 429 에러 반환

### 3. 데이터 검증

- 필수 필드 검증
- 데이터 타입 및 범위 검증
- 타임스탬프 유효성 검증 (5분 이내)
- SQL 인젝션 방지를 위한 입력값 정제

### 4. RLS (Row Level Security)

- 테이블에 RLS 활성화
- service_role만 읽기/쓰기 가능

## 문제 해결

### 1. 401 Unauthorized

- URL의 secret 파라미터 확인
- 환경 변수 `TRADINGVIEW_WEBHOOK_SECRET` 값과 일치하는지 확인
- URL 형식 확인: `?secret=your-secret-key-here`

### 2. 429 Rate Limit Exceeded

- 요청 빈도 줄이기
- Rate limit 설정 조정

### 3. 400 Bad Request

- JSON 형식 확인
- 필수 필드 누락 여부 확인
- 타임스탬프 형식 확인

### 4. 500 Internal Server Error

- Edge Function 로그 확인
- 데이터베이스 연결 확인
- 환경 변수 설정 확인

## 추가 기능 구현 아이디어

1. **알림 전송**: 특정 조건 충족 시 이메일/SMS 알림
2. **자동 매매**: 신호에 따른 자동 주문 실행
3. **대시보드**: 웹훅 데이터 시각화
4. **백테스팅**: 저장된 신호로 전략 성능 분석
5. **다중 전략 지원**: 전략별 성능 추적

## 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [TradingView Webhooks 문서](https://www.tradingview.com/support/solutions/43000529348-about-webhooks/)
- [프로젝트 GitHub 저장소](https://github.com/your-username/trader-api)
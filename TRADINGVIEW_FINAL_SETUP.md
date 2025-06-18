# TradingView Webhook 최종 설정 가이드 ✅

## 설정 완료 사항

1. **Edge Function**: `tradingview-webhook` 배포 완료
2. **JWT 검증**: 비활성화 완료
3. **시크릿 토큰**: `flwkbf1922jb4` 설정 완료

## TradingView에서 사용하기

### 1. Webhook URL
```
https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/tradingview-webhook?secret=flwkbf1922jb4
```

### 2. Alert 설정 방법
1. TradingView 차트에서 Alert 생성 (종 아이콘 클릭)
2. Condition 설정 (전략 또는 지표 조건)
3. "Notifications" 탭으로 이동
4. "Webhook URL" 체크박스 활성화
5. 위의 URL 붙여넣기
6. "Message" 필드에 아래 JSON 템플릿 입력

### 3. Alert Message 템플릿

#### 기본 템플릿
```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "volume": {{volume}},
  "time": "{{timenow}}",
  "strategy": "manual_alert",
  "timeframe": "{{interval}}"
}
```

#### 전략 사용 시
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{strategy.order.price}},
  "volume": {{volume}},
  "text": "{{strategy.order.comment}}",
  "time": "{{timenow}}",
  "strategy": "my_strategy_name",
  "timeframe": "{{interval}}",
  "indicators": {
    "macd": {{plot_0}},
    "wr": {{plot_1}},
    "rsi": {{plot_2}}
  }
}
```

### 4. TradingView 변수 설명
- `{{ticker}}`: 종목 심볼 (예: AAPL, NVDA)
- `{{close}}`: 현재 종가
- `{{volume}}`: 거래량
- `{{timenow}}`: 현재 시간
- `{{interval}}`: 차트 시간대 (1, 5, 15, 60, D, W 등)
- `{{strategy.order.action}}`: 전략 액션 (buy/sell)
- `{{strategy.order.comment}}`: 전략 코멘트
- `{{plot_0}}`, `{{plot_1}}`: 인디케이터 값

## 데이터 확인

### SQL 쿼리로 확인
```sql
-- 최근 10개 웹훅 데이터
SELECT 
  id,
  payload->>'ticker' as symbol,
  event_type as action,
  payload->>'price' as price,
  payload->>'strategy' as strategy,
  created_at
FROM tradingview_webhooks 
ORDER BY created_at DESC 
LIMIT 10;

-- 특정 종목의 신호
SELECT * FROM tradingview_webhooks 
WHERE payload->>'ticker' = 'AAPL'
ORDER BY created_at DESC;

-- 오늘의 모든 신호
SELECT * FROM tradingview_webhooks 
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

## 테스트 스크립트

```bash
# 웹훅 테스트
curl -X POST 'https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/tradingview-webhook?secret=flwkbf1922jb4' \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TSLA",
    "action": "buy",
    "price": 245.50,
    "volume": 1500000,
    "time": "'$(date -u +"%Y-%m-%d %H:%M:%S")'",
    "strategy": "test",
    "timeframe": "1h"
  }'
```

## 문제 해결

### 401 Unauthorized
- URL의 secret 파라미터 확인: `?secret=flwkbf1922jb4`

### 400 Bad Request
- JSON 형식 확인 (큰따옴표 사용)
- 필수 필드 확인: symbol, action, price

### 데이터가 저장되지 않음
- Supabase 대시보드에서 Edge Function 로그 확인
- Table Editor에서 `tradingview_webhooks` 테이블 확인

## 활용 예시

### 1. RSI 과매도 Alert
```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "volume": {{volume}},
  "text": "RSI < 30 과매도 구간",
  "time": "{{timenow}}",
  "strategy": "rsi_oversold",
  "timeframe": "{{interval}}",
  "indicators": {
    "rsi": {{plot_0}}
  }
}
```

### 2. 이동평균선 골든크로스
```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "volume": {{volume}},
  "text": "MA20이 MA50을 상향돌파",
  "time": "{{timenow}}",
  "strategy": "ma_golden_cross",
  "timeframe": "{{interval}}",
  "indicators": {
    "ma20": {{plot_0}},
    "ma50": {{plot_1}}
  }
}
```

### 3. MACD 시그널
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "volume": {{volume}},
  "text": "MACD {{strategy.order.action}} 시그널",
  "time": "{{timenow}}",
  "strategy": "macd_signal",
  "timeframe": "{{interval}}",
  "indicators": {
    "macd": {{plot_0}},
    "signal": {{plot_1}},
    "histogram": {{plot_2}}
  }
}
```

## 다음 단계

1. **대시보드 구축**: 저장된 웹훅 데이터를 시각화
2. **자동 매매 연동**: 신호에 따른 자동 주문 실행
3. **백테스팅**: 저장된 신호로 전략 성능 분석
4. **알림 시스템**: 중요 신호 발생 시 이메일/SMS 알림

## 성공! 🎉

이제 TradingView의 모든 Alert를 Supabase에 자동으로 저장할 수 있습니다!
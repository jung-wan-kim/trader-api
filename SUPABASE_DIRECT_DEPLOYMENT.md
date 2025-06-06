# 🚀 Supabase Edge Functions 직접 배포 가이드

## 📌 배포 방법

### 방법 1: Supabase Dashboard에서 직접 생성 (권장) ✅

가장 쉽고 빠른 방법입니다!

1. **Supabase Dashboard 접속**
   ```
   https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions
   ```

2. **각 함수별로 생성:**

#### 1️⃣ Market Data Function
- **New Function** 클릭
- 함수 이름: `market-data`
- 아래 코드 복사/붙여넣기:

```typescript
// 파일 경로: /supabase/functions/market-data/index.ts 의 전체 내용을 복사
```

#### 2️⃣ Trading Signals Function
- **New Function** 클릭
- 함수 이름: `trading-signals`
- 아래 코드 복사/붙여넣기:

```typescript
// 파일 경로: /supabase/functions/trading-signals/index.ts 의 전체 내용을 복사
```

#### 3️⃣ Portfolio Management Function
- **New Function** 클릭
- 함수 이름: `portfolio-management`
- 아래 코드 복사/붙여넣기:

```typescript
// 파일 경로: /supabase/functions/portfolio-management/index.ts 의 전체 내용을 복사
```

3. **환경 변수 설정**
   - 각 함수의 Settings 탭으로 이동
   - **Add secret** 클릭
   - 다음 환경 변수 추가:
     ```
     FINNHUB_API_KEY = d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
     ```

4. **Deploy** 버튼 클릭

### 방법 2: Access Token을 사용한 CLI 배포

1. **Access Token 생성**
   - https://app.supabase.com/account/tokens 접속
   - **Generate new token** 클릭
   - 토큰 복사

2. **CLI에서 토큰 설정**
   ```bash
   export SUPABASE_ACCESS_TOKEN="your-access-token-here"
   ```

3. **프로젝트 연결**
   ```bash
   cd /Users/jung-wankim/Project/trader-api
   supabase link --project-ref lgebgddeerpxdjvtqvoi
   ```

4. **Functions 배포**
   ```bash
   # Secrets 설정
   supabase secrets set FINNHUB_API_KEY=d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
   
   # Functions 배포
   supabase functions deploy market-data
   supabase functions deploy trading-signals
   supabase functions deploy portfolio-management
   ```

### 방법 3: 수동으로 cURL 사용 (고급)

각 함수에 대해 아래 명령 실행:

```bash
# market-data 함수 생성
curl -X POST https://app.supabase.com/api/projects/lgebgddeerpxdjvtqvoi/functions \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "market-data",
    "verify_jwt": true
  }'
```

## 🧪 배포 확인 및 테스트

### 1. Dashboard에서 확인
```
https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions
```

### 2. API로 테스트

#### Market Data 테스트
```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "quote",
    "symbol": "AAPL"
  }'
```

#### Trading Signals 테스트
```bash
curl -X POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "strategy": "jesse_livermore",
    "timeframe": "D"
  }'
```

## 📝 중요 정보

### 프로젝트 정보
- **Project ID**: `lgebgddeerpxdjvtqvoi`
- **Project URL**: `https://lgebgddeerpxdjvtqvoi.supabase.co`

### API Keys
- **Anon Key** (공개 가능):
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE
  ```

- **Service Role Key** (비공개 - 서버에서만 사용):
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE5NzYwOSwiZXhwIjoyMDY0NzczNjA5fQ.X-8mGiWHKUKaZW4ZrtDXNUhISTAtZFZGsreB5peGgbQ
  ```

- **Finnhub API Key**:
  ```
  d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
  ```

## 🎯 Flutter 앱에서 사용

```dart
// Supabase 초기화
await Supabase.initialize(
  url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE',
);

// Edge Function 호출
final response = await supabase.functions.invoke(
  'market-data',
  body: {
    'action': 'quote',
    'symbol': 'AAPL',
  },
);
```

## ⚡ 빠른 시작

**가장 빠른 방법은 Supabase Dashboard에서 직접 함수를 생성하는 것입니다!**

1. [Functions 페이지 열기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)
2. 각 함수 생성 (market-data, trading-signals, portfolio-management)
3. 코드 복사/붙여넣기
4. Deploy!

완료! 🎉
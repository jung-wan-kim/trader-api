# 🚀 최종 Edge Functions 배포 가이드

## ✅ 현재 상태
- **Supabase 프로젝트**: 생성 완료 ✅
- **데이터베이스 스키마**: 준비 완료 ✅
- **Edge Functions 코드**: 작성 완료 ✅
- **Edge Functions 배포**: 대기 중 ⏳

## 🎯 즉시 배포하는 가장 쉬운 방법

### 📱 Supabase Dashboard에서 배포 (5분 소요)

#### Step 1: Functions 페이지 접속
👉 **[클릭하여 Functions 페이지 열기](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions)**

#### Step 2: 첫 번째 함수 생성 - Market Data
1. **"New Function"** 버튼 클릭
2. 함수 이름 입력: `market-data`
3. 에디터에 아래 경로의 코드 전체 복사/붙여넣기:
   ```
   /Users/jung-wankim/Project/trader-api/supabase/functions/market-data/index.ts
   ```
4. **"Deploy"** 버튼 클릭

#### Step 3: 두 번째 함수 생성 - Trading Signals
1. **"New Function"** 버튼 클릭
2. 함수 이름 입력: `trading-signals`
3. 에디터에 아래 경로의 코드 전체 복사/붙여넣기:
   ```
   /Users/jung-wankim/Project/trader-api/supabase/functions/trading-signals/index.ts
   ```
4. **"Deploy"** 버튼 클릭

#### Step 4: 세 번째 함수 생성 - Portfolio Management
1. **"New Function"** 버튼 클릭
2. 함수 이름 입력: `portfolio-management`
3. 에디터에 아래 경로의 코드 전체 복사/붙여넣기:
   ```
   /Users/jung-wankim/Project/trader-api/supabase/functions/portfolio-management/index.ts
   ```
4. **"Deploy"** 버튼 클릭

#### Step 5: 환경 변수 설정
1. **Settings → Secrets** 탭으로 이동
2. **"Add new secret"** 클릭
3. 다음 정보 입력:
   - Name: `FINNHUB_API_KEY`
   - Value: `d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg`
4. **"Save"** 클릭

## 🧪 배포 확인 테스트

터미널에서 실행:
```bash
cd /Users/jung-wankim/Project/trader-api
./test-edge-functions.sh
```

성공 시 다음과 같은 응답을 받게 됩니다:
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

## 📱 Flutter 앱에서 사용하기

```dart
// 1. Supabase 초기화 (main.dart)
await Supabase.initialize(
  url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE',
);

// 2. 시장 데이터 조회
final response = await Supabase.instance.client.functions.invoke(
  'market-data',
  body: {
    'action': 'quote',
    'symbol': 'AAPL',
  },
);

print('현재가: ${response.data['data']['c']}');

// 3. 트레이딩 신호 받기
final signal = await Supabase.instance.client.functions.invoke(
  'trading-signals',
  body: {
    'symbol': 'AAPL',
    'strategy': 'jesse_livermore',
    'timeframe': 'D',
  },
);

print('신호: ${signal.data['signal']['action']}');
print('신뢰도: ${signal.data['signal']['confidence']}');
```

## 📊 Edge Functions URL 정리

배포 후 사용 가능한 엔드포인트:

| Function | URL |
|----------|-----|
| Market Data | `https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data` |
| Trading Signals | `https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals` |
| Portfolio Management | `https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/portfolio-management` |

## 🔑 중요 정보 (Flutter 앱에 필요)

```dart
// constants.dart
class SupabaseConfig {
  static const String url = 'https://lgebgddeerpxdjvtqvoi.supabase.co';
  static const String anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE';
}
```

## ✨ 완료!

Edge Functions가 배포되면:
1. ✅ Flutter 앱에서 바로 사용 가능
2. ✅ 서버 관리 불필요
3. ✅ 자동 스케일링
4. ✅ 실시간 데이터 제공

---

**🎉 축하합니다! Serverless 트레이딩 API가 완성되었습니다!**
# 🚀 Trader API - Supabase Serverless Architecture

## 📋 개요

Trader API가 **완전한 Serverless 아키텍처**로 전환되었습니다! 서버 관리 없이 Supabase의 강력한 기능들을 활용하여 확장 가능하고 비용 효율적인 트레이딩 플랫폼을 구축했습니다.

## 🏗️ 아키텍처

### 기존 아키텍처 (Express.js)
```
Flutter App → Express.js Server → Supabase DB
                ↓
            Finnhub API
```

### 새로운 Serverless 아키텍처
```
Flutter App → Supabase Client SDK
    ↓               ↓
Supabase Auth   Supabase DB (RLS)
    ↓               ↓
Edge Functions → Finnhub API
```

## ✨ 주요 특징

### 🔐 **인증 시스템**
- **Supabase Auth**: JWT 자동 관리, 소셜 로그인 지원
- **Row Level Security (RLS)**: 데이터베이스 레벨 보안
- **구독 티어 관리**: Basic, Premium, Professional

### 📊 **실시간 데이터**
- **Edge Functions**: Finnhub API 통합
- **데이터 캐싱**: 자동 캐싱으로 API 호출 최적화
- **실시간 구독**: PostgreSQL 변경사항 실시간 알림

### 🎯 **트레이딩 전략**
- **Jesse Livermore**: 추세 추종 전략
- **Larry Williams**: 단기 모멘텀 전략
- **Stan Weinstein**: 스테이지 분석 전략

### 💼 **포트폴리오 관리**
- **자동 리스크 관리**: 포지션당 최대 10% 제한
- **실시간 손익 계산**: Edge Functions에서 처리
- **성과 분석**: 샤프 비율, 최대 낙폭, 승률

## 🛠️ 설정 방법

### 1. Supabase 프로젝트 설정

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 로컬 개발 서버 시작
supabase start
```

### 2. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
supabase db push

# 또는 직접 실행
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20240607000000_initial_serverless_schema.sql
```

### 3. Edge Functions 배포

```bash
# 모든 Edge Functions 배포
supabase functions deploy market-data
supabase functions deploy trading-signals
supabase functions deploy portfolio-management

# 환경 변수 설정
supabase secrets set FINNHUB_API_KEY=your_finnhub_api_key
```

### 4. Flutter 앱 설정

```dart
// pubspec.yaml
dependencies:
  supabase_flutter: ^2.0.0

// main.dart
void main() async {
  await Supabase.initialize(
    url: 'https://lgebgddeerpxdjvtqvoi.supabase.co',
    anonKey: 'your-anon-key',
  );
  runApp(MyApp());
}
```

## 📱 Flutter 통합 예제

### 인증
```dart
// 회원가입
final response = await supabase.auth.signUp(
  email: email,
  password: password,
);

// 로그인
final response = await supabase.auth.signInWithPassword(
  email: email,
  password: password,
);
```

### 실시간 데이터
```dart
// 시장 데이터 조회
final response = await supabase.functions.invoke(
  'market-data',
  body: {
    'action': 'quote',
    'symbol': 'AAPL',
  },
);

// 실시간 추천 구독
supabase
  .from('recommendations')
  .stream(primaryKey: ['id'])
  .listen((data) {
    print('New recommendation: $data');
  });
```

### 포트폴리오 관리
```dart
// 포트폴리오 조회 (RLS 자동 적용)
final portfolios = await supabase
  .from('portfolios')
  .select();

// 포지션 생성
final response = await supabase.functions.invoke(
  'portfolio-management',
  body: {
    'action': 'create_position',
    'portfolioId': portfolioId,
    'data': positionData,
  },
);
```

## 🔒 보안 설정

### Row Level Security (RLS) 정책
```sql
-- 사용자는 자신의 데이터만 볼 수 있음
CREATE POLICY "Users can view own data" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

-- 구독한 전략의 추천만 볼 수 있음
CREATE POLICY "View subscribed recommendations" ON recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_strategy_subscriptions
      WHERE user_id = auth.uid()
      AND strategy_id = recommendations.strategy_id
    )
  );
```

### Edge Functions 보안
- 모든 요청에 JWT 토큰 검증
- 구독 티어별 접근 제어
- Rate limiting 자동 적용

## 💰 비용 분석

### 기존 (Express.js + 호스팅)
- 서버 호스팅: $10-50/월
- Supabase Pro: $25/월
- **총 비용**: $35-75/월

### Serverless
- Supabase Pro: $25/월
- Edge Functions: ~$5/월 (사용량 기반)
- **총 비용**: $25-30/월 (30-50% 절감)

## 📊 성능 최적화

### 캐싱 전략
```typescript
// Edge Function에서 자동 캐싱
const cacheMinutes = {
  quote: 1,        // 1분
  candles: 5,      // 5분
  news: 60,        // 1시간
  profile: 1440,   // 24시간
};
```

### 데이터베이스 인덱스
```sql
CREATE INDEX idx_positions_portfolio_status ON positions(portfolio_id, status);
CREATE INDEX idx_recommendations_strategy_active ON recommendations(strategy_id, is_active);
CREATE INDEX idx_market_cache_symbol_type ON market_data_cache(symbol, data_type);
```

## 🚀 배포

### Supabase Dashboard
1. [Supabase Dashboard](https://app.supabase.com)에서 프로젝트 생성
2. SQL Editor에서 마이그레이션 실행
3. Edge Functions 배포
4. 환경 변수 설정

### GitHub Actions
```yaml
name: Deploy to Supabase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

## 📱 클라이언트 라이브러리

### Flutter
```bash
# 설치
flutter pub add supabase_flutter

# 전체 예제는 flutter_integration/example/main.dart 참조
```

### JavaScript/TypeScript
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, anonKey)

// 인증
const { user } = await supabase.auth.signInWithPassword({
  email, password
})

// 데이터 조회
const { data } = await supabase
  .from('portfolios')
  .select()
```

## 🔧 개발 도구

### Supabase CLI
```bash
# 타입 생성
supabase gen types typescript --project-id lgebgddeerpxdjvtqvoi > types/supabase.ts

# 로그 확인
supabase functions logs market-data

# 로컬 테스트
supabase functions serve market-data
```

### 디버깅
```typescript
// Edge Function 로깅
console.log('Debug:', { symbol, action, user: user.id })

// Supabase Dashboard에서 로그 확인
// Project Settings > Logs > Edge Functions
```

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Edge Functions 가이드](https://supabase.com/docs/guides/functions)
- [Flutter 통합 가이드](https://supabase.com/docs/guides/getting-started/tutorials/with-flutter)
- [RLS 정책 가이드](https://supabase.com/docs/guides/auth/row-level-security)

## 🎯 다음 단계

1. **프로덕션 배포**: Supabase Dashboard에서 프로젝트 생성
2. **커스텀 도메인**: 프로젝트 설정에서 도메인 연결
3. **모니터링**: Supabase Dashboard의 분석 도구 활용
4. **확장**: 더 많은 Edge Functions 추가

---

**🎉 Serverless Trader API로 확장 가능하고 비용 효율적인 트레이딩 플랫폼을 구축하세요!**
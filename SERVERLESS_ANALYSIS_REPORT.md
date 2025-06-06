# 📊 Serverless 아키텍처 전환 분석 보고서

## 🎯 분석 개요

현재 TypeScript Express.js 기반의 Trader API를 **서버 배포 없이 Supabase만을 활용한 Serverless 구조**로 전환 가능성을 분석했습니다.

## 📋 현재 API 구조 분석

### **현재 아키텍처**
```
Client (Flutter) → Express.js API Server → Supabase Database
                 ↗ Finnhub API
```

### **제안하는 Serverless 아키텍처**
```
Client (Flutter) → Supabase Edge Functions → Supabase Database
                 ↗ Finnhub API (Edge Functions 내에서 호출)
```

## ✅ Serverless 전환 가능한 기능들

### 🔐 **인증 시스템 (100% 가능)**
- **Supabase Auth**: 기본 제공되는 인증 시스템
- **JWT 토큰**: Supabase가 자동 관리
- **소셜 로그인**: Google, GitHub 등 기본 지원
- **사용자 관리**: Admin API로 완전 제어

**현재 API** → **Serverless 대체**
```javascript
// 현재: Express.js 컨트롤러
POST /api/v1/auth/register → supabase.auth.signUp()
POST /api/v1/auth/login → supabase.auth.signInWithPassword()
POST /api/v1/auth/logout → supabase.auth.signOut()
```

### 💾 **데이터 관리 (95% 가능)**
- **CRUD 작업**: Supabase Client SDK로 직접 처리
- **RLS (Row Level Security)**: 세밀한 권한 제어
- **실시간 구독**: Real-time subscriptions
- **복잡한 쿼리**: PostgreSQL 함수 활용

**현재 API** → **Serverless 대체**
```javascript
// 현재: Express.js 컨트롤러
GET /api/v1/portfolio → supabase.from('portfolios').select()
POST /api/v1/portfolio → supabase.from('portfolios').insert()
```

### 📊 **시장 데이터 (Edge Functions 필요)**
- **Finnhub API 호출**: Edge Functions에서 처리
- **데이터 캐싱**: Supabase 테이블에 저장
- **실시간 업데이트**: Database triggers + webhooks

## 🚧 제약사항 및 해결방안

### 1. **외부 API 호출 제한**
**문제**: Supabase Client에서 직접 Finnhub API 호출 시 CORS, API 키 노출 문제

**해결방안**:
```javascript
// Supabase Edge Function 생성
// supabase/functions/market-data/index.ts
export default async function handler(req: Request) {
  const symbol = req.url.searchParams.get('symbol');
  const finnhubResponse = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  );
  return new Response(JSON.stringify(data));
}
```

### 2. **복잡한 비즈니스 로직**
**문제**: 트레이딩 전략 계산, 기술적 지표 등 복잡한 로직

**해결방안**:
- **PostgreSQL 함수**: 복잡한 계산을 DB 함수로 이전
- **Edge Functions**: 실시간 계산이 필요한 로직
- **Client-side 계산**: 단순한 UI 로직

### 3. **WebSocket 실시간 통신**
**문제**: 현재 WebSocket 서버가 필요한 실시간 기능

**해결방안**:
- **Supabase Realtime**: PostgreSQL 변경사항 실시간 구독
- **Server-Sent Events**: Edge Functions에서 스트리밍

## 📈 Serverless 전환 비교표

| 기능 영역 | 현재 구현 | Serverless 대안 | 전환 난이도 | 성능 영향 |
|-----------|-----------|-----------------|-------------|-----------|
| **인증** | JWT + Express | Supabase Auth | ⭐ 쉬움 | 🟢 개선 |
| **사용자 관리** | Custom API | Supabase Admin | ⭐ 쉬움 | 🟢 개선 |
| **포트폴리오 CRUD** | Express + Supabase | Supabase Client | ⭐⭐ 쉬움 | 🟢 개선 |
| **실시간 데이터** | WebSocket | Supabase Realtime | ⭐⭐⭐ 보통 | 🟡 동일 |
| **시장 데이터** | Express + Finnhub | Edge Functions | ⭐⭐⭐ 보통 | 🟡 동일 |
| **트레이딩 전략** | Express Logic | PostgreSQL Functions | ⭐⭐⭐⭐ 어려움 | 🟡 동일 |
| **기술적 지표** | Node.js 계산 | Edge Functions | ⭐⭐⭐⭐ 어려움 | 🔴 저하 |
| **파일 업로드** | Express Multer | Supabase Storage | ⭐⭐ 쉬움 | 🟢 개선 |

## 💰 비용 및 성능 분석

### **비용 비교**
```
현재 아키텍처:
- Server 호스팅: $10-50/월 (Railway/Vercel)
- Supabase: $25/월 (Pro plan)
- 총합: $35-75/월

Serverless 아키텍처:
- Supabase Pro: $25/월
- Edge Functions: $2/100만 실행
- 총합: $25-30/월 (약 30-50% 절감)
```

### **성능 영향**
- **Cold Start**: Edge Functions 초기 실행 지연 (100-500ms)
- **지리적 분산**: 전세계 Edge 서버에서 실행
- **Auto Scaling**: 트래픽에 따른 자동 확장
- **캐싱**: Supabase 내장 캐싱 활용

## 🔄 단계별 전환 전략

### **Phase 1: 인증 시스템 전환** (1-2일)
```javascript
// Flutter 앱에서 직접 Supabase Auth 사용
final supabase = SupabaseClient(url, anonKey);
await supabase.auth.signUp(email: email, password: password);
await supabase.auth.signInWithPassword(email: email, password: password);
```

### **Phase 2: 데이터 CRUD 전환** (2-3일)
```javascript
// 포트폴리오 관리를 직접 Supabase Client로
await supabase.from('portfolios').select().eq('user_id', userId);
await supabase.from('positions').insert(newPosition);
```

### **Phase 3: Edge Functions 구현** (3-5일)
```javascript
// 시장 데이터용 Edge Function
supabase/functions/
├── market-data/
├── trading-signals/
├── portfolio-analysis/
└── recommendations/
```

### **Phase 4: 복잡한 로직 이전** (5-7일)
```sql
-- PostgreSQL 함수로 트레이딩 전략 구현
CREATE OR REPLACE FUNCTION calculate_jesse_livermore_signal(
  symbol TEXT,
  timeframe TEXT
) RETURNS JSON AS $$
  -- 복잡한 전략 로직
$$ LANGUAGE plpgsql;
```

## ⚠️ 주요 고려사항

### **1. Flutter 앱 수정 필요**
```dart
// API 호출 방식 변경
// 기존: http.get('https://api.server.com/portfolio')
// 신규: supabase.from('portfolios').select()
```

### **2. 실시간 기능 재구현**
```dart
// WebSocket → Supabase Realtime
supabase.from('recommendations').stream().listen((data) {
  // 실시간 추천 업데이트
});
```

### **3. 오프라인 지원 고려**
- **로컬 캐싱**: Supabase는 오프라인 우선 지원이 제한적
- **데이터 동기화**: 네트워크 재연결 시 동기화 로직 필요

## 📊 권장사항

### **✅ Serverless 전환 추천 시나리오**
- **비용 최적화**가 중요한 경우
- **간단한 CRUD 위주** 애플리케이션
- **트래픽이 불규칙적**인 경우
- **글로벌 서비스** 출시 계획

### **❌ 현재 구조 유지 추천 시나리오**
- **복잡한 실시간 계산**이 많은 경우
- **레거시 코드 유지**가 중요한 경우
- **커스텀 비즈니스 로직**이 복잡한 경우
- **개발 리소스가 제한적**인 경우

## 🎯 결론 및 제안

### **단기 제안 (1-2주 내)**
1. **하이브리드 접근**: 인증만 Supabase Auth로 우선 전환
2. **POC 개발**: 핵심 API 2-3개를 Edge Functions로 구현해보기
3. **성능 테스트**: Cold start, 응답시간 등 실제 측정

### **장기 제안 (1-2개월)**
- 현재 Express.js API의 **80-90%는 Serverless로 전환 가능**
- **30-50% 비용 절감** 및 **Auto Scaling** 혜택
- **개발 복잡도 증가**를 감안한 리소스 계획 필요

**최종 권장**: 비용 절감이 중요하고 개발 리소스가 충분하다면 **단계적 Serverless 전환을 추천**합니다. 특히 트래픽이 불규칙적인 스타트업 환경에서는 매우 유리할 것으로 분석됩니다.
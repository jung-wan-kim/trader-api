# Supabase 초기 설정 가이드

## ✅ 완료한 작업
1. **SQL 스키마 실행** - `supabase/migrations/001_initial_schema.sql` 실행 완료

## 📋 추가로 필요한 설정 작업

### 1. 환경 변수 설정 (.env 파일 생성)
```bash
# .env 파일을 생성하고 실제 값으로 채워주세요
cp .env.example .env
```

필수 환경 변수:
```env
# Supabase (이미 가지고 있는 정보)
SUPABASE_URL=https://lgebgddeerpxdjvtqvoi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE
SUPABASE_SERVICE_ROLE_KEY=[Supabase 대시보드에서 확인 필요]

# 필수 외부 API
FINNHUB_API_KEY=[Finnhub에서 무료 API 키 발급 필요]

# 기본 설정
PORT=3000
NODE_ENV=development
```

### 2. Supabase 대시보드에서 추가 설정

#### A. Service Role Key 확인
1. Supabase 대시보드 → Settings → API
2. "Service role key (secret)" 복사
3. `.env` 파일의 `SUPABASE_SERVICE_ROLE_KEY`에 붙여넣기

#### B. RLS (Row Level Security) 확인
SQL 스키마에서 이미 설정했지만, 대시보드에서 확인:
- Authentication → Policies에서 각 테이블의 RLS 정책 확인
- 모든 테이블에 RLS가 활성화되어 있는지 확인

#### C. 인증 설정
1. Authentication → Providers
2. Email 인증 활성화 확인
3. 필요시 OAuth providers 추가 (Google, GitHub 등)

### 3. 초기 데이터 설정

#### A. 전략 데이터 삽입
Supabase SQL Editor에서 실행:
```sql
-- 이미 seed.sql에 포함되어 있지만 없다면 실행
INSERT INTO trader_strategies (name, type, description, min_tier, risk_level, config) VALUES
('Jesse Livermore Trend Following', 'jesse_livermore', '...', 'basic', 'moderate', '{}'),
('Larry Williams Momentum', 'larry_williams', '...', 'premium', 'aggressive', '{}'),
('Stan Weinstein Stage Analysis', 'stan_weinstein', '...', 'premium', 'moderate', '{}');
```

#### B. 테스트 사용자 생성 (선택사항)
```sql
-- Supabase Auth를 통해 사용자 생성 또는 앱에서 회원가입
```

### 4. 외부 서비스 설정

#### A. Finnhub API 키 발급
1. https://finnhub.io 방문
2. 무료 계정 생성
3. API 키 발급 후 `.env`에 추가

#### B. 선택적 서비스 (필요시)
- **Redis**: 캐싱용 (로컬에서는 선택사항)
- **Stripe**: 결제 시스템 (프로덕션에서 필요)
- **SendGrid**: 이메일 알림 (프로덕션에서 필요)

### 5. 애플리케이션 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 정상 작동 확인
curl http://localhost:3000/health
```

### 6. Supabase Functions (선택사항)

필요시 Edge Functions 추가:
```bash
# Supabase CLI 설치 (아직 안 했다면)
npm install -g supabase

# Functions 생성 예시
supabase functions new calculate-portfolio-value
```

### 7. 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Service Role Key는 절대 클라이언트에 노출하지 않기
- [ ] CORS 설정 확인 (`CORS_ORIGIN` 환경 변수)
- [ ] Rate limiting 설정 확인

### 8. 모니터링 설정 (프로덕션)

1. **Supabase 대시보드**
   - Database → Logs에서 쿼리 모니터링
   - Authentication → Logs에서 인증 이벤트 확인

2. **애플리케이션 로그**
   - `logs/` 디렉토리에 로그 파일 생성됨
   - Winston logger 설정 확인

## 🚀 빠른 시작 명령어

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 실제 값 입력

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. API 테스트
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

## 📚 참고 문서

- [Supabase 문서](https://supabase.com/docs)
- [프로젝트 API 문서](./docs/PRD.md)
- [테스트 가이드](./TESTING.md)
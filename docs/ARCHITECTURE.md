# Trader API 아키텍처 문서

## 목차
- [시스템 개요](#시스템-개요)
- [아키텍처 개요](#아키텍처-개요)
- [기술 스택](#기술-스택)
- [시스템 구조](#시스템-구조)
- [데이터베이스 설계](#데이터베이스-설계)
- [API 설계](#api-설계)
- [보안 아키텍처](#보안-아키텍처)
- [성능 및 확장성](#성능-및-확장성)
- [모니터링](#모니터링)
- [배포 아키텍처](#배포-아키텍처)

## 시스템 개요

Trader API는 AI 기반 주식 투자 추천 서비스의 백엔드 시스템입니다. 실시간 시장 데이터 분석, 개인화된 투자 추천, 포트폴리오 관리, 다양한 투자 전략을 제공하는 RESTful API 서비스입니다.

### 주요 기능
- **사용자 인증 및 관리**: JWT 기반 인증 시스템
- **실시간 시장 데이터**: Finnhub API 연동을 통한 실시간 주식 데이터
- **AI 투자 추천**: 다양한 투자 전략 기반 개인화된 추천 시스템
- **포트폴리오 관리**: 사용자별 포트폴리오 추적 및 성과 분석
- **구독 관리**: 계층별 서비스 제공 및 결제 시스템
- **투자 전략**: Jesse Livermore, 모멘텀, 리버설 등 다양한 전략

### 비즈니스 목표
- 초보 투자자도 쉽게 활용할 수 있는 AI 기반 투자 추천
- 실시간 시장 분석을 통한 정확한 투자 시점 제공
- 개인의 투자 성향에 맞춘 맞춤형 포트폴리오 관리
- 구독 모델을 통한 안정적인 수익 구조

## 아키텍처 개요

### 전체 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Client    │    │  Admin Panel    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │   API Server    │    │   API Server    │
│  (Node.js/      │    │  (Node.js/      │    │  (Node.js/      │
│   Express)      │    │   Express)      │    │   Express)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │   (PostgreSQL)  │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Finnhub API   │    │   Redis Cache   │    │   File Storage  │
│ (Market Data)   │    │   (Optional)    │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 마이크로서비스 지향 설계

현재는 모노리스 구조이지만, 향후 마이크로서비스로 분리 가능한 구조로 설계되었습니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trader API (Monolith)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Market    │  │Recommendation│              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Portfolio   │  │  Strategy   │  │Subscription │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 기술 스택

### 백엔드 핵심 기술
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Language**: JavaScript (ES6+), TypeScript (부분적)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth + JWT
- **Validation**: express-validator, Joi
- **Documentation**: Swagger/OpenAPI 3.0

### 외부 서비스
- **Market Data**: Finnhub API
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Caching**: Node-cache (향후 Redis 확장 가능)
- **Logging**: Winston

### 개발 도구
- **Testing**: Jest + Supertest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Build**: TypeScript Compiler
- **Container**: Docker + Docker Compose

### 배포 및 운영
- **Container**: Docker
- **Orchestration**: Docker Compose (개발), Kubernetes (프로덕션)
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston Logs + 헬스체크 엔드포인트

## 시스템 구조

### 레이어드 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Routes    │  │ Middleware  │  │ Validators  │             │
│  │ (Express)   │  │(Auth, Rate  │  │(Input Valid)│             │
│  │             │  │ Limit, etc) │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       Business Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │Controllers  │  │  Services   │  │   Utils     │             │
│  │(Request     │  │(Business    │  │  (Logger,   │             │
│  │ Handling)   │  │  Logic)     │  │  Helpers)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Database   │  │ External    │  │   Cache     │             │
│  │ (Supabase)  │  │ APIs        │  │(Node-cache) │             │
│  │             │  │(Finnhub)    │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 컴포넌트 다이어그램

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│   Rate Limiter  │────│   Auth Guard    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                        Controllers                             │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   AuthController│ MarketController│ RecommendController│ PortfolioCtrl │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                         Services                               │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  AuthService    │ FinnhubService  │ RecommendService│PortfolioSvc│
└─────────────────┴─────────────────┴─────────────────┴───────────┘
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Sources                              │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Supabase DB   │   Finnhub API   │   Cache Layer   │  Logger   │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### 데이터 플로우

```
Client Request
      │
      ▼
┌─────────────────┐
│  Rate Limiter   │ ──── API 호출 빈도 제한
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Authentication  │ ──── JWT 토큰 검증
└─────────────────┘
      │
      ▼
┌─────────────────┐
│   Validation    │ ──── 입력 데이터 검증
└─────────────────┘
      │
      ▼
┌─────────────────┐
│   Controller    │ ──── 요청 처리 및 응답
└─────────────────┘
      │
      ▼
┌─────────────────┐
│    Service      │ ──── 비즈니스 로직 처리
└─────────────────┘
      │
      ▼
┌─────────────────┐
│   Data Layer    │ ──── 데이터 조회/저장
└─────────────────┘
      │
      ▼
   Response
```

## 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Users       │       │   Strategies    │       │ Recommendations │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │   ┌───│ name            │   ┌───│ strategy_id (FK)│
│ name            │   │   │ type            │   │   │ symbol          │
│ investment_style│   │   │ description     │   │   │ action          │
│ subscription_tier│   │   │ subscription_req│   │   │ confidence      │
│ created_at      │   │   │ created_at      │   │   │ target_price    │
└─────────────────┘   │   └─────────────────┘   │   │ created_at      │
         │            │            │            │   └─────────────────┘
         │            │            │            │            │
         ▼            │            ▼            │            ▼
┌─────────────────┐   │   ┌─────────────────┐   │   ┌─────────────────┐
│   Portfolios    │   │   │ User_Strategy   │   │   │   Positions     │
├─────────────────┤   │   │  Subscriptions  │   │   ├─────────────────┤
│ id (PK)         │   │   ├─────────────────┤   │   │ id (PK)         │
│ user_id (FK)    │───┘   │ user_id (FK)    │───┘   │ portfolio_id(FK)│
│ name            │       │ strategy_id(FK) │       │ symbol          │
│ initial_capital │       │ subscribed_at   │       │ quantity        │
│ current_value   │       └─────────────────┘       │ entry_price     │
│ created_at      │                                 │ status          │
└─────────────────┘                                 │ created_at      │
         │                                          └─────────────────┘
         │                                                   │
         └───────────────────────────────────────────────────┘
```

### 주요 테이블 설명

#### users (사용자)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  investment_style VARCHAR(20) DEFAULT 'moderate',
  subscription_tier VARCHAR(20) DEFAULT 'basic',
  risk_tolerance INTEGER DEFAULT 5,
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### strategies (투자 전략)
```sql
CREATE TABLE strategies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  description TEXT,
  subscription_required VARCHAR(20) DEFAULT 'basic',
  parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### recommendations (투자 추천)
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id VARCHAR(50) REFERENCES strategies(id),
  symbol VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell', 'hold')),
  confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  target_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  risk_level VARCHAR(10) DEFAULT 'medium',
  reasoning TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### 인덱스 설계

```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_recommendations_symbol ON recommendations(symbol);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX idx_recommendations_strategy_id ON recommendations(strategy_id);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_users_email ON users(email);
```

## API 설계

### RESTful API 설계 원칙

1. **리소스 중심 URL**: `/api/v1/resources`
2. **HTTP 메서드 활용**: GET, POST, PUT, DELETE
3. **상태 코드 활용**: 2xx, 4xx, 5xx
4. **버전 관리**: URL path에 버전 포함
5. **일관된 응답 형식**: JSON 기반 표준화된 응답

### API 엔드포인트 구조

```
/api/v1/
├── auth/
│   ├── POST /register           # 회원가입
│   ├── POST /login              # 로그인
│   ├── POST /refresh            # 토큰 갱신
│   ├── POST /logout             # 로그아웃
│   ├── GET  /profile            # 프로필 조회
│   ├── PUT  /profile            # 프로필 수정
│   └── POST /change-password    # 비밀번호 변경
├── market/
│   ├── GET  /quote/{symbol}     # 실시간 시세
│   ├── GET  /candles/{symbol}   # 차트 데이터
│   ├── GET  /search             # 종목 검색
│   └── GET  /news               # 시장 뉴스
├── recommendations/
│   ├── GET  /                   # 추천 목록
│   ├── GET  /{id}               # 추천 상세
│   ├── POST /{id}/feedback      # 추천 피드백
│   └── GET  /history            # 추천 이력
├── portfolio/
│   ├── GET  /                   # 포트폴리오 목록
│   ├── POST /                   # 포트폴리오 생성
│   ├── GET  /{id}               # 포트폴리오 상세
│   ├── PUT  /{id}               # 포트폴리오 수정
│   ├── GET  /{id}/positions     # 포지션 목록
│   ├── POST /{id}/positions     # 포지션 추가
│   ├── PUT  /positions/{id}     # 포지션 수정
│   └── DELETE /positions/{id}   # 포지션 삭제
├── strategies/
│   ├── GET  /                   # 전략 목록
│   ├── GET  /{id}               # 전략 상세
│   ├── POST /{id}/subscribe     # 전략 구독
│   └── DELETE /{id}/unsubscribe # 전략 구독 취소
└── subscription/
    ├── GET  /plans              # 구독 플랜 목록
    ├── POST /subscribe          # 구독 신청
    ├── PUT  /upgrade            # 구독 업그레이드
    └── DELETE /cancel           # 구독 취소
```

### 응답 형식 표준화

#### 성공 응답
```json
{
  "data": {
    // 실제 데이터
  },
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 에러 응답
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {
    // 추가 에러 정보
  }
}
```

#### 페이지네이션 응답
```json
{
  "data": [
    // 페이지 데이터
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## 보안 아키텍처

### 인증 및 인가

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │────│  JWT Token      │────│   API Server    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │ Token Validation│    │ Authorization   │
         │              │ (Middleware)    │    │   Check         │
         │              └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Supabase Auth  │    │  Refresh Token  │    │  Role-based     │
│   (Primary)     │    │   Management    │    │   Access        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 보안 계층

1. **네트워크 보안**
   - HTTPS/TLS 1.3 강제 사용
   - CORS 정책 적용
   - Rate Limiting (API 호출 제한)

2. **애플리케이션 보안**
   - JWT 토큰 기반 인증
   - Input validation (모든 입력 검증)
   - SQL injection 방지 (Parameterized query)
   - XSS 방지 (Input sanitization)

3. **데이터 보안**
   - 비밀번호 해싱 (bcrypt)
   - 민감 정보 암호화
   - 환경 변수로 시크릿 관리
   - 데이터베이스 접근 제어

### 보안 미들웨어

```javascript
// 보안 미들웨어 스택
app.use(helmet()); // 보안 헤더 설정
app.use(cors(corsOptions)); // CORS 설정
app.use(rateLimiter); // Rate limiting
app.use(authenticate); // JWT 인증
app.use(authorize); // 권한 검증
app.use(validateInput); // 입력 검증
```

## 성능 및 확장성

### 성능 최적화 전략

1. **데이터베이스 최적화**
   - 적절한 인덱스 설계
   - 쿼리 최적화
   - Connection pooling
   - 읽기 전용 replica 활용 (향후)

2. **캐싱 전략**
   ```
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │   Application   │────│   Memory Cache  │────│   Database      │
   │     Layer       │    │  (Node-cache)   │    │  (Supabase)     │
   └─────────────────┘    └─────────────────┘    └─────────────────┘
            │                       │                       │
            │              ┌─────────────────┐              │
            │──────────────│   Redis Cache   │──────────────│
            │              │   (Optional)    │              │
            │              └─────────────────┘              │
            │                                               │
            └───────────────────────────────────────────────┘
   ```

3. **API 성능**
   - Gzip 압축
   - 응답 캐싱
   - 비동기 처리
   - Lazy loading

### 확장성 설계

1. **수평 확장**
   ```
   ┌─────────────────┐
   │  Load Balancer  │
   └─────────────────┘
            │
   ┌────────┼────────┐
   │        │        │
   ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐
│ API  │ │ API  │ │ API  │
│Server│ │Server│ │Server│
└──────┘ └──────┘ └──────┘
   ```

2. **마이크로서비스 전환 준비**
   - 도메인별 모듈 분리
   - 느슨한 결합 설계
   - 이벤트 기반 아키텍처 준비

### 모니터링 및 관찰성

```
┌─────────────────────────────────────────────────────────────────┐
│                        Observability                           │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│    Logging      │    Metrics      │     Tracing     │  Health   │
│   (Winston)     │   (Custom)      │    (Future)     │  Check    │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

1. **로깅**
   - 구조화된 로그 (JSON)
   - 로그 레벨별 분류
   - 에러 추적 및 알림

2. **메트릭**
   - API 응답 시간
   - 에러율 추적
   - 사용량 모니터링

3. **헬스체크**
   - `/health` 엔드포인트
   - 데이터베이스 연결 상태
   - 외부 서비스 상태

## 배포 아키텍처

### 컨테이너화

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 환경별 배포

```
┌─────────────────────────────────────────────────────────────────┐
│                       Development                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Local Docker  │  Docker Compose │      Development DB         │
└─────────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Staging                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Docker Swarm  │    Load Balancer│        Staging DB           │
└─────────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Production                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Kubernetes    │    Ingress      │      Production DB          │
│   (or similar)  │   Controller    │     (High Availability)     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### CI/CD 파이프라인

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Code      │────│   Build     │────│    Test     │────│   Deploy    │
│   Push      │    │   & Lint    │    │  & Security │    │ & Monitor   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GitHub    │    │   GitHub    │    │   Automated │    │   Container │
│   Webhook   │    │   Actions   │    │   Testing   │    │   Registry  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 향후 개선 방향

### 기술적 개선사항

1. **마이크로서비스 분리**
   - 도메인별 서비스 분리
   - API Gateway 도입
   - 서비스 메시 구축

2. **데이터 파이프라인**
   - 실시간 데이터 스트리밍
   - ML 모델 파이프라인
   - 데이터 웨어하우스 구축

3. **고급 보안**
   - OAuth 2.0/OIDC
   - API Key 관리
   - 감사 로그

### 비즈니스 확장

1. **다국가 지원**
   - 다국어 지원
   - 지역별 규정 준수
   - 다양한 거래소 연동

2. **AI/ML 고도화**
   - 개인화 추천 알고리즘
   - 실시간 위험 관리
   - 자동 매매 시스템

---

이 아키텍처 문서는 시스템의 지속적인 발전과 함께 업데이트되어야 합니다. 

**문서 버전**: 1.0.0  
**최종 업데이트**: 2024년 6월  
**다음 리뷰 예정**: 2024년 9월
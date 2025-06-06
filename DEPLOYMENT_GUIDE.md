# 🚀 Trader API 배포 가이드

이 문서는 Trader API 백엔드의 배포 환경 구성 및 배포 프로세스를 안내합니다.

## 📋 목차

1. [환경 준비](#환경-준비)
2. [Docker 배포](#docker-배포)
3. [Railway 배포](#railway-배포)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [환경별 설정](#환경별-설정)
6. [모니터링 및 헬스체크](#모니터링-및-헬스체크)
7. [보안 설정](#보안-설정)
8. [문제 해결](#문제-해결)

## 🛠 환경 준비

### 필수 요구사항

- Node.js 18.x 이상
- npm 9.x 이상
- Docker 및 Docker Compose
- Supabase 계정 및 프로젝트
- Finnhub API 키

### 환경 변수 설정

1. 환경별 `.env` 파일 생성:
   ```bash
   cp .env.example .env.production
   cp .env.example .env.staging
   cp .env.example .env.development
   ```

2. 각 환경에 맞는 값 설정:
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_ANON_KEY`: Supabase 익명 키
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키
   - `JWT_SECRET`: 최소 32자리 비밀 키
   - `FINNHUB_API_KEY`: Finnhub API 키

## 🐳 Docker 배포

### 로컬 Docker 빌드

```bash
# 프로덕션 이미지 빌드
docker build -t trader-api:latest .

# 개발 환경 실행
docker-compose -f docker-compose.dev.yml up -d

# 프로덕션 환경 실행
docker-compose up -d
```

### Docker Hub/GitHub Container Registry 배포

```bash
# GitHub Container Registry에 푸시
docker tag trader-api:latest ghcr.io/username/trader-api:latest
docker push ghcr.io/username/trader-api:latest
```

## 🚄 Railway 배포

### 1. Railway CLI 설치

```bash
npm install -g @railway/cli
railway login
```

### 2. 프로젝트 초기화

```bash
railway init
railway link [project-id]
```

### 3. 환경 변수 설정

```bash
# 프로덕션 환경 변수 설정
railway variables set NODE_ENV=production
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_ANON_KEY=your_anon_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
railway variables set JWT_SECRET=your_jwt_secret
railway variables set FINNHUB_API_KEY=your_finnhub_key
```

### 4. 배포

```bash
# 수동 배포
railway up

# 자동 배포 (GitHub 연동)
railway connect
```

## ⚙️ GitHub Actions CI/CD

### 1. GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서 다음 설정:

```
SUPABASE_URL: Supabase 프로젝트 URL
SUPABASE_ANON_KEY: Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 역할 키 (CI용)
PRODUCTION_URL: 프로덕션 서버 URL
RAILWAY_TOKEN: Railway 배포 토큰 (선택사항)
SLACK_WEBHOOK: Slack 알림 웹훅 (선택사항)
```

### 2. 배포 브랜치 전략

- `main` 브랜치: 프로덕션 배포
- `develop` 브랜치: 스테이징 배포
- PR: 테스트 및 빌드 검증

### 3. 배포 플로우

```
코드 푸시 → 테스트 실행 → 보안 스캔 → Docker 빌드 → 배포 → 헬스체크
```

## 🌍 환경별 설정

### Development (개발)
- 상세한 로깅 (debug 레벨)
- Rate limiting 비활성화
- CORS 허용범위 확대
- 캐싱 비활성화

### Staging (스테이징)
- 프로덕션 유사 설정
- 중간 수준 로깅 (info 레벨)
- Rate limiting 활성화
- 모든 기능 테스트

### Production (프로덕션)
- 최소 로깅 (warn 레벨)
- 엄격한 보안 설정
- 성능 최적화
- 모니터링 활성화

## 📊 모니터링 및 헬스체크

### 헬스체크 엔드포인트

```
GET /health                 # 기본 헬스체크
GET /health/detailed        # 상세 헬스체크
GET /health/ready           # Kubernetes readiness probe
GET /health/live            # Kubernetes liveness probe
GET /metrics                # 메트릭 정보 (인증 필요)
```

### 모니터링 메트릭

- HTTP 요청 수 및 응답 시간
- 에러율 및 에러 로그
- 데이터베이스 쿼리 성능
- 외부 API 호출 상태
- 시스템 리소스 사용량

### 로그 관리

```bash
# 로그 확인
docker-compose logs trader-api

# 실시간 로그 모니터링
docker-compose logs -f trader-api

# 에러 로그만 확인
grep "ERROR" logs/error.log
```

## 🔒 보안 설정

### 환경 변수 보안

- 프로덕션에서 민감한 정보 마스킹
- JWT 시크릿 최소 32자리
- bcrypt 라운드 12 이상
- API 키 로테이션 계획

### 네트워크 보안

- HTTPS 강제 리다이렉트
- 보안 헤더 설정 (Helmet)
- Rate limiting 적용
- CORS 정책 엄격히 관리

### 접근 제어

- IP 화이트리스트 (관리자용)
- API 키 기반 인증
- JWT 토큰 만료 관리
- 감사 로그 기록

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 빌드 실패
```bash
# 종속성 문제
npm ci
npm run build

# TypeScript 컴파일 오류
npm run typecheck
```

#### 2. 데이터베이스 연결 실패
```bash
# Supabase 연결 확인
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
```

#### 3. 메모리 부족
```bash
# Docker 메모리 제한 증가
docker-compose.yml에서 memory limit 조정
```

#### 4. Rate Limiting 문제
```bash
# Redis 연결 확인
redis-cli ping

# Rate limit 설정 확인
env | grep RATE_LIMIT
```

### 로그 분석

```bash
# 에러 패턴 분석
grep -E "(ERROR|FATAL)" logs/combined.log | tail -20

# 응답 시간 분석
grep "HTTP Request" logs/combined.log | grep -E "responseTime.*[5-9][0-9]{2,}ms"

# 데이터베이스 쿼리 성능
grep "Database Query" logs/combined.log | grep -E "duration.*[1-9][0-9]{3,}ms"
```

### 성능 최적화

1. **메모리 사용량 모니터링**
   ```bash
   curl http://your-api/health/detailed
   ```

2. **응답 시간 개선**
   - 데이터베이스 쿼리 최적화
   - 캐싱 전략 적용
   - API 호출 최적화

3. **부하 테스트**
   ```bash
   # Artillery 사용 예시
   npm install -g artillery
   artillery quick --count 100 --num 10 http://your-api/health
   ```

## 📞 지원 및 문의

배포 관련 문제가 발생하면:

1. GitHub Issues에 문제 등록
2. 로그 파일 첨부
3. 환경 정보 포함 (민감한 정보 제외)
4. 재현 단계 상세 기술

---

**주의사항**: 프로덕션 배포 전 반드시 스테이징 환경에서 충분히 테스트하세요.
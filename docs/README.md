# Trader API 문서 센터

## 📚 문서 목록

이 디렉토리에는 Trader API의 모든 문서가 포함되어 있습니다.

### 🚀 시작하기
- [**사용자 매뉴얼**](USER_MANUAL.md) - API 사용법과 예제 코드
- [**개발자 가이드**](DEVELOPER_GUIDE.md) - 로컬 개발 환경 설정 및 개발 가이드

### 🏗️ 기술 문서
- [**아키텍처 문서**](ARCHITECTURE.md) - 시스템 구조 및 설계 원리
- [**OpenAPI 스펙**](openapi.yaml) - API 명세서 (Swagger/OpenAPI 3.0)

### 🌍 다국어 지원
- [**English Documentation**](en/) - Documentation in English
  - [User Manual (EN)](en/USER_MANUAL_EN.md)
- [**한국어 문서**](ko/) - 한국어 문서 (향후 추가 예정)

### 📖 추가 문서
- [**배포 가이드**](../DEPLOYMENT.md) - 프로덕션 배포 방법
- [**GitHub 설정 가이드**](../SETUP_GITHUB.md) - CI/CD 설정

## 🔗 라이브 문서

### API 문서
- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs) (개발 환경)
- **OpenAPI JSON**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### 프로덕션 환경
- **API 문서**: [https://api.trader-app.com/docs](https://api.trader-app.com/docs)
- **API 스펙**: [https://api.trader-app.com/api-docs](https://api.trader-app.com/api-docs)

## 📋 빠른 시작 가이드

### 1. 개발자를 위한 빠른 시작
```bash
# 1. 저장소 클론
git clone https://github.com/your-org/trader-api.git
cd trader-api

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정

# 4. 개발 서버 실행
npm run dev

# 5. API 문서 확인
open http://localhost:3000/docs
```

### 2. API 사용자를 위한 빠른 시작
```bash
# 회원가입
curl -X POST https://api.trader-app.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"홍길동","investmentStyle":"moderate"}'

# 주식 시세 조회 (인증 불필요)
curl https://api.trader-app.com/api/v1/market/quote/AAPL

# 투자 추천 조회 (인증 필요)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.trader-app.com/api/v1/recommendations
```

## 🛠️ 기술 스택

### 백엔드
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT + Supabase Auth
- **Documentation**: Swagger/OpenAPI 3.0

### 외부 서비스
- **Market Data**: Finnhub API
- **Database & Auth**: Supabase
- **Containerization**: Docker

### 개발 도구
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier
- **Type Checking**: TypeScript (부분적)
- **CI/CD**: GitHub Actions

## 📊 API 개요

### 주요 엔드포인트

#### 인증 (Authentication)
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `GET /api/v1/auth/profile` - 프로필 조회

#### 시장 데이터 (Market Data)
- `GET /api/v1/market/quote/{symbol}` - 실시간 시세
- `GET /api/v1/market/candles/{symbol}` - 차트 데이터

#### 투자 추천 (Recommendations)
- `GET /api/v1/recommendations` - 추천 목록
- `GET /api/v1/recommendations/{id}` - 추천 상세

#### 포트폴리오 (Portfolio)
- `GET /api/v1/portfolio` - 포트폴리오 목록
- `POST /api/v1/portfolio/{id}/positions` - 포지션 추가

### 구독 플랜
- **Basic** (무료): 일일 3개 추천, Jesse Livermore 전략
- **Premium** ($29/월): 일일 50개 추천, 모든 전략
- **Professional** ($99/월): 무제한 추천, 고급 분석

## 📞 지원 및 연락처

### 개발자 지원
- **이메일**: dev-support@trader-api.com
- **GitHub Issues**: [프로젝트 이슈 페이지](https://github.com/your-org/trader-api/issues)
- **문서 개선**: Pull Request 환영

### 사용자 지원
- **일반 지원**: support@trader-api.com
- **구독 문의**: billing@trader-api.com
- **API 문의**: api-support@trader-api.com

### 커뮤니티
- **개발자 커뮤니티**: [Discord](https://discord.gg/trader-api) (예정)
- **API 사용자 그룹**: [Slack](https://trader-api.slack.com) (예정)

## 📈 로드맵

### 현재 버전 (v1.0)
- ✅ RESTful API 완성
- ✅ 35개 엔드포인트 구현
- ✅ Swagger 문서 자동화
- ✅ 다중 투자 전략 지원

### 다음 버전 (v1.1) - 예정
- 🔄 WebSocket 실시간 알림
- 🔄 GraphQL API 지원
- 🔄 모바일 SDK (iOS, Android)
- 🔄 백테스팅 API

### 향후 계획 (v2.0+)
- 📅 마이크로서비스 아키텍처 전환
- 📅 AI 모델 API 직접 접근
- 📅 암호화폐 지원
- 📅 국제 시장 확장

## 📝 변경 이력

### v1.0.0 (2024-06)
- 초기 API 릴리스
- 기본 CRUD 기능 구현
- Swagger 문서화 완료
- Docker 배포 지원

## 🤝 기여하기

### 문서 개선
1. 이 저장소를 Fork
2. 문서 수정
3. Pull Request 생성

### 코드 기여
1. [개발자 가이드](DEVELOPER_GUIDE.md) 참조
2. 이슈 생성 후 개발
3. 테스트 포함하여 PR 생성

### 번역 기여
- 새로운 언어 번역 환영
- `docs/[언어코드]/` 디렉토리 생성
- 기존 문서 번역 후 PR 생성

---

**마지막 업데이트**: 2024년 6월  
**문서 버전**: 1.0.0

더 자세한 정보는 각 문서를 참조하거나 [API 문서](http://localhost:3000/docs)를 확인하세요.
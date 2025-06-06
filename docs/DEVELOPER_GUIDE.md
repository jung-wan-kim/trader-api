# Trader API 개발자 가이드

## 목차
- [시작하기](#시작하기)
- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [API 개발](#api-개발)
- [데이터베이스](#데이터베이스)
- [테스트](#테스트)
- [배포](#배포)
- [기여하기](#기여하기)

## 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 8.0.0 이상
- Git
- Docker (선택사항, 컨테이너 배포용)

### 개발 환경 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/your-organization/trader-api.git
cd trader-api
```

#### 2. 의존성 설치
```bash
npm install
```

#### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 서버 설정
NODE_ENV=development
PORT=3000

# 데이터베이스 (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 외부 API
FINNHUB_API_KEY=your_finnhub_api_key

# JWT 설정
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3001

# 로그 설정
LOG_LEVEL=debug
```

#### 4. 데이터베이스 설정
```bash
# Supabase 프로젝트에서 SQL 스크립트 실행
# src/models/schema.sql과 src/models/seed.sql을 순서대로 실행
```

#### 5. 개발 서버 실행
```bash
# TypeScript 컴파일 및 실행
npm run dev

# 또는 JavaScript로 직접 실행
npm run dev:js
```

서버가 `http://localhost:3000`에서 실행됩니다.

#### 6. API 문서 확인
브라우저에서 `http://localhost:3000/docs`를 열어 Swagger UI로 API 문서를 확인할 수 있습니다.

## 프로젝트 구조

```
trader-api/
├── docs/                           # 문서
│   ├── openapi.yaml                # OpenAPI 스펙
│   ├── DEVELOPER_GUIDE.md          # 개발자 가이드
│   └── ARCHITECTURE.md             # 아키텍처 문서
├── src/                            # 소스 코드
│   ├── config/                     # 설정 파일
│   │   ├── database.js             # 데이터베이스 설정
│   │   ├── supabase.js             # Supabase 클라이언트
│   │   └── swagger.js              # Swagger 설정
│   ├── controllers/                # 컨트롤러
│   │   ├── authController.js       # 인증 관련
│   │   ├── marketController.js     # 시장 데이터
│   │   ├── portfolioController.js  # 포트폴리오 관리
│   │   ├── recommendationController.js # 추천 시스템
│   │   ├── strategyController.js   # 전략 관리
│   │   └── subscriptionController.js # 구독 관리
│   ├── middleware/                 # 미들웨어
│   │   ├── auth.js                 # 인증 미들웨어
│   │   ├── errorHandler.js         # 에러 처리
│   │   └── rateLimiter.js          # 속도 제한
│   ├── models/                     # 데이터 모델
│   │   ├── schema.sql              # 데이터베이스 스키마
│   │   └── seed.sql                # 초기 데이터
│   ├── routes/                     # 라우터
│   │   ├── auth.js                 # 인증 라우트
│   │   ├── market.js               # 시장 데이터 라우트
│   │   ├── portfolio.js            # 포트폴리오 라우트
│   │   ├── recommendations.js      # 추천 라우트
│   │   ├── strategies.js           # 전략 라우트
│   │   └── subscription.js         # 구독 라우트
│   ├── services/                   # 서비스
│   │   └── finnhubService.js       # Finnhub API 서비스
│   ├── utils/                      # 유틸리티
│   │   └── logger.ts               # 로깅 유틸리티
│   ├── validators/                 # 입력 검증
│   │   ├── auth.js                 # 인증 검증
│   │   ├── market.js               # 시장 데이터 검증
│   │   ├── portfolio.js            # 포트폴리오 검증
│   │   └── recommendation.js       # 추천 검증
│   └── server.js                   # 메인 서버 파일
├── tests/                          # 테스트 파일
├── docker-compose.yml              # Docker Compose 설정
├── Dockerfile                      # Docker 이미지 설정
├── jest.config.js                  # Jest 테스트 설정
├── package.json                    # 프로젝트 의존성
└── README.md                       # 프로젝트 설명
```

### 주요 디렉토리 설명

#### `src/controllers/`
각 기능별 비즈니스 로직을 처리하는 컨트롤러들입니다.
- **authController.js**: 사용자 인증, 회원가입, 로그인, 프로필 관리
- **marketController.js**: 실시간 주식 데이터, 차트 데이터 제공
- **recommendationController.js**: AI 기반 투자 추천 생성 및 관리
- **portfolioController.js**: 사용자 포트폴리오 및 거래 내역 관리
- **strategyController.js**: 투자 전략 관리 및 구독
- **subscriptionController.js**: 구독 및 결제 관리

#### `src/middleware/`
Express.js 미들웨어들입니다.
- **auth.js**: JWT 토큰 검증 및 사용자 인증
- **errorHandler.js**: 전역 에러 처리
- **rateLimiter.js**: API 호출 빈도 제한

#### `src/services/`
외부 API 연동 및 비즈니스 서비스들입니다.
- **finnhubService.js**: Finnhub API를 통한 실시간 주식 데이터 조회

#### `src/validators/`
입력 데이터 검증 로직들입니다.
- express-validator를 사용한 요청 데이터 검증

## API 개발

### 새로운 엔드포인트 추가

#### 1. 라우터 정의
`src/routes/` 디렉토리에 새로운 라우트 파일을 생성하거나 기존 파일을 수정합니다.

```javascript
// src/routes/example.js
import express from 'express';
import * as exampleController from '../controllers/exampleController.js';
import { authenticate } from '../middleware/auth.js';
import { validateExample } from '../validators/example.js';

const router = express.Router();

router.get('/', authenticate, exampleController.getExamples);
router.post('/', authenticate, validateExample, exampleController.createExample);

export default router;
```

#### 2. 컨트롤러 구현
`src/controllers/` 디렉토리에 비즈니스 로직을 구현합니다.

```javascript
// src/controllers/exampleController.js
import { supabase } from '../config/database.js';
import logger from '../utils/logger.ts';

/**
 * @swagger
 * /example:
 *   get:
 *     tags:
 *       - Example
 *     summary: Get examples
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Examples retrieved successfully
 */
export const getExamples = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('examples')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    res.json({ data });
  } catch (error) {
    logger.error('Error getting examples:', error);
    next(error);
  }
};
```

#### 3. 검증자 추가
`src/validators/` 디렉토리에 입력 검증 로직을 추가합니다.

```javascript
// src/validators/example.js
import { body } from 'express-validator';

export const validateExample = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];
```

#### 4. 서버에 라우트 추가
`src/server.js`에 새로운 라우트를 추가합니다.

```javascript
import exampleRoutes from './routes/example.js';

app.use('/api/v1/example', exampleRoutes);
```

### API 문서화

모든 API 엔드포인트는 JSDoc 주석을 사용하여 문서화해야 합니다.

```javascript
/**
 * @swagger
 * /api/v1/endpoint:
 *   post:
 *     tags:
 *       - TagName
 *     summary: Brief description
 *     description: Detailed description
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: value
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 */
```

## 데이터베이스

### Supabase 설정

이 프로젝트는 Supabase를 데이터베이스로 사용합니다.

#### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 웹사이트에서 새 프로젝트 생성
2. 데이터베이스 비밀번호 설정
3. API 키와 URL 확인

#### 2. 스키마 적용
```sql
-- src/models/schema.sql 파일의 내용을 Supabase SQL 에디터에서 실행
```

#### 3. 초기 데이터 삽입
```sql
-- src/models/seed.sql 파일의 내용을 실행하여 초기 데이터 삽입
```

### 데이터베이스 쿼리

Supabase JavaScript 클라이언트를 사용하여 데이터베이스와 상호작용합니다.

```javascript
import { supabase } from '../config/database.js';

// SELECT
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');

// INSERT
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' })
  .select();

// UPDATE
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', id)
  .select();

// DELETE
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

## 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 실행
npm run test:controllers
npm run test:services
npm run test:middleware

# 테스트 커버리지 확인
npm run test:coverage

# 감시 모드로 테스트 실행
npm run test:watch
```

### 테스트 작성

Jest를 사용하여 테스트를 작성합니다.

```javascript
// tests/controllers/auth.test.js
import request from 'supertest';
import app from '../../src/server.js';

describe('Auth Controller', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        investmentStyle: 'moderate'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should return error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        investmentStyle: 'moderate'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});
```

## 배포

### Docker 사용

#### 1. Docker 이미지 빌드
```bash
docker build -t trader-api .
```

#### 2. Docker 컨테이너 실행
```bash
docker run -p 3000:3000 --env-file .env trader-api
```

#### 3. Docker Compose 사용
```bash
docker-compose up -d
```

### 프로덕션 배포

#### 1. 빌드
```bash
npm run build
```

#### 2. 프로덕션 실행
```bash
NODE_ENV=production npm start
```

### 환경별 설정

#### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
```

#### Production
```env
NODE_ENV=production
LOG_LEVEL=info
```

## 기여하기

### 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `hotfix/*`: 핫픽스 브랜치

### 커밋 메시지 규칙

```
type(scope): description

feat(auth): add password reset functionality
fix(api): resolve rate limiting issue
docs(readme): update installation instructions
test(auth): add login controller tests
refactor(database): optimize query performance
```

### Pull Request 가이드라인

1. 기능별로 별도 브랜치 생성
2. 충분한 테스트 커버리지 확보
3. API 문서 업데이트
4. 코드 리뷰 요청

### 코딩 스타일

#### ESLint 설정 사용
```bash
npm run lint
npm run lint:fix
```

#### Prettier 포맷팅
```bash
npm run format
```

### 보안 가이드라인

1. **환경 변수**: 민감한 정보는 반드시 환경 변수로 관리
2. **입력 검증**: 모든 사용자 입력에 대해 검증 수행
3. **인증**: JWT 토큰 만료 시간 설정 및 갱신 로직 구현
4. **HTTPS**: 프로덕션에서는 HTTPS 사용 필수
5. **Rate Limiting**: API 호출 빈도 제한 적용

### 성능 최적화

1. **데이터베이스**: 적절한 인덱스 설정
2. **캐싱**: 자주 조회되는 데이터 캐싱
3. **압축**: gzip 압축 사용
4. **로깅**: 적절한 로그 레벨 설정

### 트러블슈팅

#### 자주 발생하는 문제들

1. **Supabase 연결 실패**
   - 환경 변수 확인
   - API 키 유효성 검증

2. **Finnhub API 제한**
   - API 키 사용량 확인
   - 캐싱 전략 구현

3. **메모리 누수**
   - 이벤트 리스너 정리
   - 데이터베이스 연결 관리

## 연락처

개발 관련 문의:
- Email: dev-team@trader-api.com
- GitHub Issues: 이슈 생성 후 문의
- 문서 개선 제안: Pull Request 생성

---

더 자세한 정보는 [API 문서](http://localhost:3000/docs)를 참조하세요.
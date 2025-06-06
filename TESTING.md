# Testing Guide

이 문서는 Trader API 프로젝트의 완벽한 테스트 스위트에 대한 가이드입니다.

## 테스트 구조

```
tests/
├── fixtures/              # 테스트 데이터
├── helpers/               # 테스트 유틸리티
│   ├── supabaseMocks.js   # Supabase 모킹 유틸리티
│   └── testUtils.js       # 일반 테스트 헬퍼
├── unit/                  # 단위 테스트
│   ├── controllers/       # 컨트롤러 테스트
│   ├── middleware/        # 미들웨어 테스트
│   ├── services/          # 서비스 테스트
│   └── utils/            # 유틸리티 테스트
├── integration/           # 통합 테스트
├── e2e/                  # End-to-End 테스트
├── performance/          # 성능 테스트
├── security/             # 보안 테스트
└── setup.js              # 테스트 설정
```

## 테스트 실행

### 모든 테스트 실행
```bash
npm test
# 또는
npm run test:all
```

### 테스트 유형별 실행

#### 단위 테스트
```bash
npm run test:unit
```
- 개별 함수와 메소드 테스트
- 각 컨트롤러, 미들웨어, 서비스의 단위별 검증
- 모킹을 통한 의존성 격리

#### 통합 테스트
```bash
npm run test:integration
```
- API 엔드포인트 전체 플로우 테스트
- 여러 컴포넌트 간의 상호작용 검증
- 실제 HTTP 요청/응답 테스트

#### E2E 테스트
```bash
npm run test:e2e
```
- 전체 사용자 시나리오 테스트
- 회원가입부터 거래 실행까지의 완전한 플로우
- 실제 사용 패턴 시뮬레이션

#### 성능 테스트
```bash
npm run test:performance
```
- API 응답 시간 측정
- 동시 접속 및 부하 테스트
- 메모리 사용량 모니터링
- SLA 요구사항 검증

#### 보안 테스트
```bash
npm run test:security
```
- SQL 인젝션 방지 테스트
- XSS 공격 방지 검증
- 인증/인가 보안 테스트
- 민감한 데이터 노출 방지 확인

### 커버리지 확인
```bash
npm run test:coverage
```
- 코드 커버리지 리포트 생성
- 목표: 90% 이상의 코드 커버리지

### 테스트 감시 모드
```bash
npm run test:watch
```
- 파일 변경 시 자동으로 관련 테스트 실행

### CI/CD용 테스트
```bash
npm run test:ci
```
- CI 환경에 최적화된 테스트 실행
- 병렬 처리 및 안정성 향상

## 테스트 작성 가이드

### 단위 테스트 작성

```javascript
import { jest } from '@jest/globals';
import { functionToTest } from '../../../src/controllers/exampleController.js';
import { createMockSupabaseClient } from '../../helpers/supabaseMocks.js';

describe('ExampleController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, params: {}, user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should handle successful operation', async () => {
    // Arrange
    const testData = { name: 'test' };
    mockReq.body = testData;

    // Act
    await functionToTest(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: testData })
    );
  });
});
```

### 통합 테스트 작성

```javascript
import request from 'supertest';
import { createApp } from '../../src/server.js';

describe('API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should handle complete API flow', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

### 모킹 가이드

#### Supabase 모킹
```javascript
import { createMockSupabaseClient } from '../helpers/supabaseMocks.js';

// 기본 모킹
const mockSupabase = createMockSupabaseClient();

// 특정 응답 설정
mockSupabase.auth.signIn.mockResolvedValue({
  data: { user: mockUser },
  error: null
});
```

#### 외부 API 모킹
```javascript
jest.mock('../../src/services/finnhubService.js', () => ({
  default: {
    getQuote: jest.fn().mockResolvedValue({
      c: 150.00,
      h: 152.00,
      l: 148.00
    })
  }
}));
```

## 테스트 데이터 관리

### 픽스처 사용
```javascript
import { mockUser, mockProfile } from '../helpers/supabaseMocks.js';
import { generateTestUser } from '../helpers/testUtils.js';

// 정적 테스트 데이터
const user = mockUser;

// 동적 테스트 데이터
const uniqueUser = generateTestUser();
```

### 테스트 데이터 정리
```javascript
afterEach(async () => {
  // 테스트 데이터 정리
  await cleanupTestData(supabaseAdmin, userId);
});
```

## 성능 테스트 지표

### 응답 시간 요구사항
- **인증 API**: 평균 200ms 이하
- **시장 데이터 API**: 평균 100ms 이하
- **추천 API**: 평균 400ms 이하
- **포트폴리오 API**: 평균 300ms 이하

### 부하 테스트 기준
- **동시 사용자**: 100명
- **초당 요청**: 1000 RPS
- **에러율**: 1% 이하
- **99퍼센타일 응답시간**: 500ms 이하

### 메모리 사용량
- **요청당 메모리 증가**: 1MB 이하
- **메모리 누수**: 없음

## 보안 테스트 체크리스트

### 인증 보안
- [ ] JWT 토큰 검증
- [ ] 만료된 토큰 거부
- [ ] 잘못된 형식의 토큰 거부
- [ ] 토큰 없는 요청 거부

### 입력 검증
- [ ] SQL 인젝션 방지
- [ ] XSS 공격 방지
- [ ] 경로 순회 공격 방지
- [ ] 데이터 타입 검증

### 권한 제어
- [ ] 수평적 권한 확대 방지
- [ ] 수직적 권한 확대 방지
- [ ] 구독 티어별 접근 제어
- [ ] 관리자 권한 보호

### 데이터 보호
- [ ] 민감한 정보 노출 방지
- [ ] 에러 메시지에서 내부 정보 숨김
- [ ] 로그에서 민감 데이터 제거
- [ ] HTTPS 강제 사용

## CI/CD 통합

### GitHub Actions 설정
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm run test:ci
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## 테스트 모범 사례

### DO
- ✅ 각 테스트를 독립적으로 작성
- ✅ 명확하고 설명적인 테스트 이름 사용
- ✅ AAA 패턴 사용 (Arrange, Act, Assert)
- ✅ 의존성 모킹으로 격리된 테스트 작성
- ✅ 에지 케이스와 에러 상황 테스트
- ✅ 성능 요구사항 검증

### DON'T
- ❌ 테스트 간 의존성 생성
- ❌ 실제 외부 API 호출
- ❌ 하드코딩된 타임아웃 사용
- ❌ 테스트 데이터 정리 생략
- ❌ 단일 테스트에서 너무 많은 것 검증
- ❌ 의미 없는 테스트 작성

## 문제 해결

### 자주 발생하는 문제

#### 테스트 타임아웃
```javascript
// jest.config.js에서 타임아웃 증가
testTimeout: 10000

// 또는 개별 테스트에서
test('long running test', async () => {
  // 테스트 코드
}, 15000);
```

#### 모킹 문제
```javascript
// 모듈 호이스팅 문제 해결
jest.mock('../module', () => ({
  default: jest.fn()
}));

// 모킹 초기화
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 메모리 누수
```javascript
// 테스트 후 정리
afterAll(async () => {
  await closeConnections();
  await new Promise(resolve => setTimeout(resolve, 500));
});
```

## 성능 모니터링

테스트 실행 시 다음 지표를 모니터링합니다:

- **테스트 실행 시간**: 전체 스위트 15분 이하
- **메모리 사용량**: 최대 2GB 이하
- **CPU 사용률**: 평균 80% 이하
- **코드 커버리지**: 90% 이상

## 기여 가이드

새로운 기능을 추가할 때는 반드시 다음 테스트를 포함해야 합니다:

1. **단위 테스트**: 모든 public 메소드
2. **통합 테스트**: API 엔드포인트
3. **보안 테스트**: 새로운 입력 검증
4. **성능 테스트**: 성능에 영향을 주는 기능

테스트 커버리지가 90% 미만이면 PR이 병합되지 않습니다.
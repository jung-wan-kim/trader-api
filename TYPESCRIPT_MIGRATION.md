# TypeScript 마이그레이션 가이드

## 개요
이 문서는 trader-api 프로젝트를 JavaScript에서 TypeScript로 점진적으로 마이그레이션하는 방법을 설명합니다.

## 초기 설정 완료

### 1. 설치된 구성 요소
- `tsconfig.json`: TypeScript 컴파일러 설정
- `typescript-setup.sh`: TypeScript 패키지 설치 스크립트
- 타입 정의 파일들 (`src/types/`)
- Jest TypeScript 설정
- ESLint TypeScript 지원

### 2. 프로젝트 구조
```
trader-api/
├── src/
│   ├── types/           # 타입 정의 파일
│   │   ├── index.ts     # 기본 도메인 타입
│   │   ├── express.d.ts # Express 확장 타입
│   │   ├── environment.d.ts # 환경 변수 타입
│   │   └── services.ts  # 서비스 관련 타입
│   ├── server.ts        # TypeScript 진입점
│   └── ... (기존 JS 파일들)
├── dist/                # 컴파일된 JS 출력
├── tsconfig.json        # TypeScript 설정
└── jest.config.ts       # Jest TypeScript 설정
```

## 설치 방법

### 1. TypeScript 패키지 설치
```bash
./typescript-setup.sh
```

### 2. package.json 업데이트
```bash
# 기존 package.json을 백업
cp package.json package.json.backup

# TypeScript 버전으로 교체
mv package.json.ts package.json
```

## 사용 방법

### 개발 서버 실행
```bash
# TypeScript 개발 서버 (자동 재시작)
npm run dev

# 기존 JavaScript 서버
npm run dev:js
```

### 빌드
```bash
# TypeScript 컴파일
npm run build

# 클린 빌드
npm run build:clean

# 와치 모드
npm run watch
```

### 타입 체크
```bash
# 컴파일 없이 타입 체크만
npm run typecheck
```

### 테스트
```bash
# 테스트 실행
npm test

# 와치 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

## 마이그레이션 전략

### 1. 점진적 마이그레이션
- `allowJs: true` 설정으로 JS와 TS 파일 공존 가능
- 기존 JS 파일을 그대로 유지하면서 점진적으로 TS로 전환

### 2. 마이그레이션 우선순위
1. 타입 정의 파일 (`types/`)
2. 유틸리티 함수 (`utils/`)
3. 서비스 레이어 (`services/`)
4. 미들웨어 (`middleware/`)
5. 컨트롤러 (`controllers/`)
6. 라우터 (`routes/`)

### 3. 파일별 마이그레이션 단계
1. `.js` 파일을 `.ts`로 복사
2. 필요한 타입 import 추가
3. 함수 매개변수와 반환값에 타입 추가
4. `any` 타입을 구체적인 타입으로 변경
5. 엄격한 타입 검사 통과 확인

## 타입 정의 활용

### 기본 타입 사용 예제
```typescript
import { User, Portfolio, Strategy } from '../types';
import { ApiResponse, PaginatedResponse } from '../types/services';

// 컨트롤러 예제
export const getPortfolio = async (
  req: Request,
  res: Response<ApiResponse<Portfolio[]>>
): Promise<void> => {
  // 구현
};
```

### Express 확장 타입
```typescript
// req.user와 req.userId 자동 타입 지원
app.get('/protected', auth, (req, res) => {
  const userId = req.userId; // string | undefined
  const user = req.user;     // User | undefined
});
```

### 환경 변수 타입
```typescript
// 자동 완성 및 타입 체크 지원
const port = process.env.PORT; // string | undefined
const nodeEnv = process.env.NODE_ENV; // 'development' | 'production' | 'test'
```

## 마이그레이션 도구

### 마이그레이션 상태 확인
```bash
node scripts/migrate-to-typescript.js
```

### TypeScript 래퍼 생성
```bash
node scripts/migrate-to-typescript.js --create-wrappers
```

## 주의사항

1. **ESM 모듈 사용**: 프로젝트가 ES 모듈을 사용하므로 import/export 구문 사용
2. **경로 별칭**: `@/` 별칭은 `src/` 디렉토리를 가리킴
3. **엄격한 모드**: 초기에는 `strict: false`로 시작하여 점진적으로 활성화
4. **타입 안정성**: 가능한 한 `any` 타입 사용을 피하고 구체적인 타입 정의

## 트러블슈팅

### 1. 모듈 해석 오류
```bash
# tsconfig.json의 moduleResolution 확인
"moduleResolution": "NodeNext"
```

### 2. 타입 정의 누락
```bash
# 필요한 @types 패키지 설치
npm install --save-dev @types/패키지명
```

### 3. Jest 실행 오류
```bash
# Jest 캐시 클리어
jest --clearCache
```

## 다음 단계

1. TypeScript 패키지 설치 (`./typescript-setup.sh`)
2. 간단한 유틸리티 함수부터 마이그레이션 시작
3. 타입 정의를 활용하여 점진적으로 전체 코드베이스 전환
4. 엄격한 타입 검사 단계적 활성화

---

마이그레이션 중 문제가 발생하면 이 가이드를 참조하거나 팀에 문의하세요.
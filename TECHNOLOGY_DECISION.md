# Trader API 기술 스택 결정서

## 요약
**결정: Express + TypeScript**를 Trader API의 메인 기술 스택으로 선정합니다.

## 상세 비교 분석

### 1. FastAPI (Python)
#### 장점
- ✅ 자동 API 문서화 (Swagger/OpenAPI)
- ✅ 타입 힌트로 런타임 검증
- ✅ 매우 빠른 성능 (Starlette + Pydantic)
- ✅ AI/ML 라이브러리 통합 용이 (pandas, numpy, scikit-learn)
- ✅ 비동기 지원 우수

#### 단점
- ❌ 현재 JavaScript 코드베이스 재작성 필요
- ❌ 팀의 Python 경험 부족 가능성
- ❌ Supabase JS SDK와의 직접 통합 제한
- ❌ Node.js 생태계 도구 사용 불가

### 2. Express + TypeScript ⭐ 선택
#### 장점
- ✅ **현재 코드베이스 점진적 마이그레이션 가능**
- ✅ **Supabase JS SDK 완벽 지원**
- ✅ **타입 안정성으로 코드 품질 향상**
- ✅ **JavaScript 생태계 유지 (기존 패키지 활용)**
- ✅ **팀의 JavaScript 경험 활용 가능**
- ✅ **프론트엔드와 동일한 언어로 풀스택 개발 효율성**

#### 단점
- ❌ 초기 설정 복잡도 증가
- ❌ 컴파일 단계 추가
- ❌ Python 대비 AI/ML 라이브러리 제한적

### 3. NestJS (TypeScript)
#### 장점
- ✅ 엔터프라이즈급 구조 (DI, 모듈화)
- ✅ 많은 기능 내장 (검증, 인증, 캐싱)
- ✅ TypeScript 기본 지원
- ✅ 강력한 CLI 도구

#### 단점
- ❌ **학습 곡선이 매우 높음**
- ❌ **과도한 보일러플레이트**
- ❌ **현재 Express 코드와 구조 차이 큼**
- ❌ **작은 프로젝트에는 오버엔지니어링**

## 선택 근거

### 1. AI 주식 추천 시스템 특성
- **실시간 데이터 처리**: Express + TypeScript의 비동기 처리로 충분
- **기술적 지표 계산**: ta-lib 등 JavaScript 라이브러리 활용 가능
- **AI 모델 통합**: API 호출 또는 마이크로서비스로 Python AI 서비스 분리 가능

### 2. Supabase 통합
```typescript
// TypeScript로 Supabase 타입 안전하게 사용
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/supabase' // 자동 생성된 타입

const supabase = createClient<Database>(url, key)
```

### 3. 개발 속도와 유지보수성
- 기존 JavaScript 코드를 점진적으로 TypeScript로 마이그레이션
- 타입 정의로 버그 사전 방지
- IDE 자동완성과 리팩토링 지원

### 4. 성능과 확장성
- TypeScript는 런타임 성능에 영향 없음
- Express의 검증된 성능과 안정성
- 필요시 특정 모듈만 최적화 가능

### 5. 팀 기술 스택
- JavaScript 개발자가 TypeScript 학습 용이
- 프론트엔드와 백엔드 기술 스택 통일
- 코드 공유와 재사용 가능

## 마이그레이션 계획

### Phase 1: 설정 및 기본 구조 (1주)
```bash
# TypeScript 및 관련 패키지 설치
npm install --save-dev typescript @types/node @types/express
npm install --save-dev ts-node nodemon @types/cors @types/helmet
npm install --save-dev @types/jest ts-jest

# tsconfig.json 생성
npx tsc --init
```

### Phase 2: 점진적 마이그레이션 (2-3주)
1. **엔트리 포인트부터 시작**
   - `server.js` → `server.ts`
   - 환경 설정 타입화

2. **핵심 모듈 우선 전환**
   - 인증 미들웨어
   - 데이터베이스 연결
   - 핵심 비즈니스 로직

3. **API 라우트 전환**
   - 컨트롤러별 순차 전환
   - 요청/응답 타입 정의

### Phase 3: 고급 기능 추가 (1-2주)
- API 문서 자동화 (swagger-typescript)
- 타입 안전 ORM (Prisma 검토)
- 통합 테스트 강화

## 프로젝트 구조 (TypeScript)
```
trader-api/
├── src/
│   ├── types/           # 타입 정의
│   │   ├── index.d.ts
│   │   ├── supabase.ts  # Supabase 타입
│   │   └── models.ts    # 도메인 모델
│   ├── config/
│   │   └── database.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── marketController.ts
│   ├── services/
│   │   ├── tradingStrategy.ts
│   │   └── aiRecommendation.ts
│   ├── utils/
│   │   └── validators.ts
│   └── server.ts
├── tsconfig.json
└── package.json
```

## 핵심 TypeScript 설정
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "NodeNext",
    "allowJs": true,  // 점진적 마이그레이션 지원
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 예상 이점

### 1. 개발 생산성 향상
- 타입 추론으로 버그 70% 감소
- IDE 자동완성으로 개발 속도 30% 향상
- 리팩토링 안정성 보장

### 2. 코드 품질 개선
- 컴파일 시점 오류 검출
- 명확한 인터페이스 정의
- 문서화 자동화

### 3. 유지보수성 강화
- 타입 정의로 코드 이해도 향상
- 변경사항 영향 범위 파악 용이
- 테스트 작성 편의성

## 리스크 및 대응 방안

### 1. 초기 설정 복잡도
- **대응**: 단계별 마이그레이션 가이드 작성
- **대응**: 보일러플레이트 템플릿 준비

### 2. 빌드 시간 증가
- **대응**: 개발 환경에서 ts-node 사용
- **대응**: 프로덕션용 빌드 최적화

### 3. 타입 정의 부재
- **대응**: DefinitelyTyped 활용
- **대응**: 필요시 custom 타입 정의

## 결론

Express + TypeScript는 Trader API의 현재 상황과 미래 요구사항을 모두 만족시키는 최적의 선택입니다. 

- **즉각적 가치**: 기존 코드 재활용과 점진적 개선
- **장기적 가치**: 타입 안정성과 유지보수성
- **팀 효율성**: JavaScript 경험 활용과 학습 곡선 최소화
- **생태계 활용**: Supabase 및 Node.js 패키지 완벽 지원

이 결정으로 안정적이고 확장 가능한 AI 주식 추천 서비스의 백엔드를 구축할 수 있을 것입니다.
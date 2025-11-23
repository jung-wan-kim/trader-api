# 프론트엔드 프로젝트 설정 가이드

## 🚀 프로젝트 구조

이 프로젝트는 모노레포 구조로 구성되어 있습니다:

```
trader-api/
├── apps/
│   ├── admin/          # 관리자 대시보드 (포트: 3001)
│   └── dashboard/      # 사용자 대시보드 (포트: 3002)
├── packages/
│   ├── ui/            # 공통 UI 컴포넌트
│   ├── types/         # 공통 타입 정의
│   └── utils/         # 공통 유틸리티
└── src/               # 백엔드 API (포트: 3000)
```

## 📦 설치 방법

### 1. pnpm 설치 (권장)

```bash
# macOS/Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 또는 npm으로 설치
npm install -g pnpm
```

### 2. 의존성 설치

```bash
# 루트 디렉토리에서 실행 (모든 패키지 설치)
pnpm install
```

## 🏃 실행 방법

### 개발 모드

```bash
# 백엔드 API만 실행
npm run dev

# 어드민 대시보드만 실행
cd apps/admin && pnpm dev

# 사용자 대시보드만 실행
cd apps/dashboard && pnpm dev

# 모든 서비스 동시 실행 (Turborepo 사용)
pnpm dev
```

### 접속 URL

- **백엔드 API**: http://localhost:3000
- **API 문서**: http://localhost:3000/api-docs
- **어드민 대시보드**: http://localhost:3001
- **사용자 대시보드**: http://localhost:3002

## 🛠️ 빌드

```bash
# 모든 앱 빌드
pnpm build

# 특정 앱만 빌드
cd apps/admin && pnpm build
cd apps/dashboard && pnpm build
```

## 📝 개발 가이드

### 새로운 컴포넌트 추가

공통 컴포넌트는 `packages/ui/src/components/`에 추가:

```typescript
// packages/ui/src/components/Button.tsx
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}
```

사용:
```typescript
// apps/admin/src/components/MyComponent.tsx
import { Button } from '@trader/ui';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

### API 클라이언트 사용

```typescript
// apps/admin/src/lib/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

### React Query 사용

```typescript
// apps/dashboard/src/hooks/useRecommendations.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export function useRecommendations() {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/recommendations');
      return data;
    },
  });
}
```

## 🎨 스타일링

Tailwind CSS를 사용합니다:

```tsx
<div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
  <h3 className="text-sm font-medium text-blue-600">제목</h3>
  <p className="text-3xl font-bold text-blue-900">내용</p>
</div>
```

## 🧪 테스트

```bash
# 모든 테스트 실행
pnpm test

# 특정 앱 테스트
cd apps/admin && pnpm test

# 테스트 커버리지
pnpm test:coverage
```

## 📦 패키지 구조

### apps/admin - 관리자 대시보드

- 사용자 관리
- 추천 관리
- 전략 관리
- 시스템 통계
- 애널리틱스

### apps/dashboard - 사용자 대시보드

- 투자 추천 확인
- 포트폴리오 관리
- 성과 분석
- 전략 선택
- 구독 관리

### packages/ui - 공통 UI 컴포넌트

- Button, Card, Table 등 기본 컴포넌트
- Chart 컴포넌트 (Recharts)
- Form 컴포넌트

### packages/types - 공통 타입

- API 타입
- 데이터 모델 타입
- 컴포넌트 Props 타입

### packages/utils - 공통 유틸리티

- API 클라이언트
- 데이터 포매터
- 검증 함수

## 🔧 환경 변수

각 앱의 `.env.local` 파일 생성:

### apps/admin/.env.local
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### apps/dashboard/.env.local
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 어드민 대시보드 배포
cd apps/admin
vercel

# 사용자 대시보드 배포
cd apps/dashboard
vercel
```

## 📚 참고 문서

- [Next.js 문서](https://nextjs.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [React Query 문서](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand 문서](https://docs.pmnd.rs/zustand/getting-started/introduction)

## 🤝 기여 가이드

1. 기능 브랜치 생성
2. 변경사항 커밋
3. PR 생성
4. 코드 리뷰 후 머지

## ⚠️ 현재 개발 상태

- ✅ 프로젝트 구조 생성
- ✅ 기본 페이지 구현
- ⏳ 컴포넌트 라이브러리 개발 중
- ⏳ API 통합 작업 중
- ⏳ 인증 시스템 구현 중

---

**최종 업데이트**: 2025-11-23
**다음 릴리즈**: Phase 1 (2주 후)

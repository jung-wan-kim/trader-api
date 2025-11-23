# Trader API 프론트엔드 아키텍처

## 목차
- [개요](#개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [어드민 웹](#어드민-웹)
- [사용자 대시보드](#사용자-대시보드)
- [공통 컴포넌트](#공통-컴포넌트)
- [상태 관리](#상태-관리)
- [API 통신](#api-통신)
- [보안](#보안)
- [배포 전략](#배포-전략)

---

## 개요

Trader API 프론트엔드는 크게 두 가지 웹 애플리케이션으로 구성됩니다:

1. **어드민 웹** - 시스템 관리자용 대시보드
2. **사용자 대시보드** - 일반 사용자용 투자 추천 및 포트폴리오 관리

### 주요 특징
- **모노레포 구조**: 효율적인 코드 공유 및 관리
- **타입 안전성**: 전체 프로젝트 TypeScript 사용
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **실시간 데이터**: WebSocket 기반 실시간 업데이트
- **SEO 최적화**: Next.js SSR/SSG 활용

---

## 기술 스택

### 프레임워크 & 라이브러리
```
Frontend Stack
├── Next.js 14 (App Router)      - React 프레임워크, SSR/SSG
├── TypeScript 5.x               - 타입 안전성
├── React 18                     - UI 라이브러리
└── Node.js 18+                  - 런타임
```

### UI & 스타일링
```
UI/UX
├── Tailwind CSS 3.x             - 유틸리티 CSS 프레임워크
├── shadcn/ui                    - 재사용 가능한 컴포넌트
├── Radix UI                     - Headless UI 컴포넌트
├── Lucide React                 - 아이콘
├── Framer Motion                - 애니메이션
└── Recharts / Chart.js          - 차트 라이브러리
```

### 상태 관리 & 데이터 페칭
```
State & Data
├── React Query (TanStack Query) - 서버 상태 관리
├── Zustand                      - 클라이언트 전역 상태
├── React Hook Form              - 폼 관리
└── Zod                          - 스키마 검증
```

### 테스팅 & 품질
```
Quality
├── Jest                         - 단위 테스트
├── React Testing Library        - 컴포넌트 테스트
├── Playwright                   - E2E 테스트
├── ESLint                       - 린팅
└── Prettier                     - 코드 포매팅
```

---

## 프로젝트 구조

### 모노레포 구조
```
trader-api/
├── apps/
│   ├── admin/                   # 어드민 웹 애플리케이션
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   │   ├── (auth)/    # 인증 레이아웃 그룹
│   │   │   │   │   ├── login/
│   │   │   │   │   └── logout/
│   │   │   │   ├── (dashboard)/ # 대시보드 레이아웃 그룹
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── users/
│   │   │   │   │   ├── recommendations/
│   │   │   │   │   ├── strategies/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   └── settings/
│   │   │   │   ├── api/        # API Routes
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/     # 어드민 전용 컴포넌트
│   │   │   ├── lib/           # 유틸리티 함수
│   │   │   ├── hooks/         # 커스텀 훅
│   │   │   ├── types/         # 타입 정의
│   │   │   └── styles/        # 스타일
│   │   ├── public/            # 정적 파일
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── dashboard/              # 사용자 대시보드
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   ├── register/
│       │   │   │   └── forgot-password/
│       │   │   ├── (main)/
│       │   │   │   ├── dashboard/     # 메인 대시보드
│       │   │   │   ├── recommendations/ # 추천 목록
│       │   │   │   ├── portfolio/     # 포트폴리오
│       │   │   │   ├── strategies/    # 전략 선택
│       │   │   │   ├── analytics/     # 성과 분석
│       │   │   │   ├── subscription/  # 구독 관리
│       │   │   │   └── settings/      # 설정
│       │   │   ├── api/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   ├── lib/
│       │   ├── hooks/
│       │   ├── types/
│       │   └── styles/
│       ├── public/
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── packages/
│   ├── ui/                     # 공통 UI 컴포넌트
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Chart/
│   │   │   │   ├── Table/
│   │   │   │   ├── Modal/
│   │   │   │   └── Form/
│   │   │   ├── index.ts
│   │   │   └── styles/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                  # 공통 타입 정의
│   │   ├── src/
│   │   │   ├── api.ts         # API 타입
│   │   │   ├── models.ts      # 데이터 모델
│   │   │   ├── components.ts  # 컴포넌트 Props
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                  # 공통 유틸리티
│   │   ├── src/
│   │   │   ├── formatters.ts  # 데이터 포매팅
│   │   │   ├── validators.ts  # 유효성 검증
│   │   │   ├── api-client.ts  # API 클라이언트
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                 # 공통 설정
│       ├── eslint-config/
│       ├── typescript-config/
│       └── tailwind-config/
│
├── src/                        # 기존 백엔드 API
├── package.json                # Root package.json
├── pnpm-workspace.yaml        # Workspace 설정
└── turbo.json                  # Turborepo 설정
```

---

## 어드민 웹

### 주요 기능

#### 1. 대시보드
- **시스템 통계**
  - 전체 사용자 수
  - 활성 사용자 수
  - 오늘의 추천 횟수
  - 수익률 통계
- **실시간 모니터링**
  - API 호출 현황
  - 에러율
  - 응답 시간
  - 서버 상태

#### 2. 사용자 관리
- 사용자 목록 (검색, 필터, 정렬)
- 사용자 상세 정보
- 구독 플랜 변경
- 사용자 비활성화/활성화
- 사용자 활동 로그

#### 3. 추천 관리
- 전체 추천 목록
- 추천 상태별 필터링
- 추천 승인/거부
- 추천 성과 추적
- 추천 피드백 관리

#### 4. 전략 관리
- 전략 목록
- 전략 활성화/비활성화
- 전략 파라미터 조정
- 전략 성과 분석
- 백테스팅 결과

#### 5. 애널리틱스
- 사용자 성장 차트
- 수익률 분석
- 전략별 성과 비교
- 구독 전환율
- 이탈률 분석

#### 6. 시스템 설정
- 환경 변수 관리
- 기능 플래그 관리
- API 키 관리
- 알림 설정
- 보안 설정

### 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│  Logo    Dashboard  Users  Recommendations  Analytics   │  ← 헤더
├───────────────────────────────────────────────────────┬─┤
│                                                       │U│
│  📊 System Overview                                  │s│
│  ┌─────────┬─────────┬─────────┬─────────┐          │e│
│  │ Total   │ Active  │ Revenue │ API     │          │r│
│  │ Users   │ Today   │ Today   │ Calls   │          │ │
│  │ 10,234  │ 2,431   │ $5,234  │ 45.2k   │          │I│
│  └─────────┴─────────┴─────────┴─────────┘          │n│
│                                                       │f│
│  📈 Performance Charts                               │o│
│  [차트 영역]                                         │ │
│                                                       │ │
│  📋 Recent Activities                                │ │
│  [활동 로그 테이블]                                  │ │
│                                                       │ │
└───────────────────────────────────────────────────────┴─┘
```

---

## 사용자 대시보드

### 주요 기능

#### 1. 메인 대시보드
- **포트폴리오 요약**
  - 총 자산
  - 수익률
  - 오늘의 손익
  - 보유 종목 수
- **오늘의 추천**
  - 최신 추천 3개
  - 추천 상세 보기
- **퀵 액션**
  - 새 추천 보기
  - 포트폴리오 추가
  - 전략 변경

#### 2. 추천 목록
- **필터링**
  - 전략별
  - 액션별 (매수/매도/홀드)
  - 신뢰도별
  - 날짜별
- **추천 카드**
  - 종목 정보
  - 추천 액션
  - 목표가/손절가
  - 신뢰도
  - 근거
- **실시간 업데이트**

#### 3. 포트폴리오
- **포지션 목록**
  - 종목별 현황
  - 수익률
  - 평가 손익
- **차트**
  - 자산 변화 추이
  - 섹터별 분산
  - 전략별 수익률
- **성과 분석**
  - 총 수익률
  - 승률
  - 샤프 비율
  - 최대 손실폭

#### 4. 전략 선택
- **전략 카드**
  - Jesse Livermore
  - Larry Williams
  - Stan Weinstein
- **전략 상세**
  - 설명
  - 과거 성과
  - 리스크 레벨
- **구독 관리**

#### 5. 구독 관리
- **현재 플랜**
- **플랜 비교**
  - Basic
  - Premium
  - Professional
- **결제 내역**
- **업그레이드/다운그레이드**

#### 6. 설정
- **프로필 정보**
- **투자 성향 설정**
- **알림 설정**
- **보안 설정**
- **테마 설정**

### 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Dashboard  📊 Recommendations  💼 Portfolio  ⚙️     │  ← 헤더
├─────────────────────────────────────────────────────────┤
│  👋 Hello, User!                               Premium  │
│                                                          │
│  💰 Portfolio Summary                                   │
│  ┌──────────┬──────────┬──────────┬──────────┐        │
│  │ Total    │ Return   │ Today    │ Holdings │        │
│  │ $125,430 │ +15.2%   │ +$1,234  │ 12       │        │
│  └──────────┴──────────┴──────────┴──────────┘        │
│                                                          │
│  🎯 Today's Recommendations                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ AAPL  BUY  $150.25  ⬆️ +2.5%  🟢 High Confidence │ │
│  │ NVDA  HOLD $480.00  ⬇️ -1.2%  🟡 Medium         │ │
│  │ TSLA  SELL $245.80  ⬇️ -3.4%  🔴 Low            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  📈 Performance Chart                                   │
│  [차트 영역]                                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 공통 컴포넌트

### UI 컴포넌트 라이브러리

#### 기본 컴포넌트
```typescript
// Button
<Button variant="primary | secondary | ghost" size="sm | md | lg">
  Click me
</Button>

// Card
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>

// Table
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>
```

#### 차트 컴포넌트
```typescript
// LineChart
<LineChart data={data} xKey="date" yKey="value" />

// BarChart
<BarChart data={data} xKey="category" yKey="count" />

// PieChart
<PieChart data={data} nameKey="name" valueKey="value" />

// CandlestickChart (주식 차트)
<CandlestickChart data={stockData} />
```

#### 폼 컴포넌트
```typescript
// Input
<Input type="text" placeholder="Enter..." />

// Select
<Select options={options} onChange={handleChange} />

// DatePicker
<DatePicker value={date} onChange={setDate} />

// Checkbox / Radio
<Checkbox checked={checked} onChange={setChecked} />
```

---

## 상태 관리

### 클라이언트 상태 (Zustand)
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// stores/themeStore.ts
interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

### 서버 상태 (React Query)
```typescript
// hooks/useRecommendations.ts
export function useRecommendations() {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
    staleTime: 5000,
  });
}

// hooks/usePortfolio.ts
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
  });
}
```

---

## API 통신

### API 클라이언트
```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

// Request Interceptor
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

### WebSocket 연결
```typescript
// hooks/useWebSocket.ts
export function useWebSocket(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    return () => ws.close();
  }, [url]);

  return data;
}
```

---

## 보안

### 인증 & 인가
- JWT 토큰 기반 인증
- 자동 토큰 갱신
- 리프레시 토큰 관리
- 로그인 세션 유지

### CSRF 방지
- CSRF 토큰 사용
- SameSite 쿠키 설정

### XSS 방지
- 입력 값 sanitize
- CSP (Content Security Policy) 설정

### 환경 변수
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## 배포 전략

### Vercel 배포
```yaml
# vercel.json
{
  "builds": [
    {
      "src": "apps/admin/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/dashboard/package.json",
      "use": "@vercel/next"
    }
  ]
}
```

### 환경별 배포
- **Development**: Vercel Preview
- **Staging**: Vercel Production (staging branch)
- **Production**: Vercel Production (main branch)

### CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Build
        run: pnpm build
      - name: Deploy to Vercel
        run: vercel --prod
```

---

## 성능 최적화

### 코드 스플리팅
- Next.js 자동 코드 스플리팅
- Dynamic imports

### 이미지 최적화
- Next.js Image 컴포넌트 사용
- WebP 포맷 사용
- Lazy loading

### 캐싱 전략
- SWR / React Query 캐싱
- Service Worker 캐싱
- CDN 캐싱

---

## 개발 로드맵

### Phase 1: 기본 구조 (1주)
- [x] 프로젝트 구조 설계
- [ ] 모노레포 설정
- [ ] 공통 컴포넌트 라이브러리
- [ ] API 클라이언트 설정

### Phase 2: 어드민 웹 (2주)
- [ ] 인증 페이지
- [ ] 대시보드 메인
- [ ] 사용자 관리
- [ ] 추천 관리

### Phase 3: 사용자 대시보드 (2주)
- [ ] 인증 페이지
- [ ] 메인 대시보드
- [ ] 추천 목록
- [ ] 포트폴리오 관리

### Phase 4: 고급 기능 (2주)
- [ ] 실시간 차트
- [ ] WebSocket 통합
- [ ] 알림 시스템
- [ ] 성과 분석

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2025-11-23
**다음 리뷰 예정**: 2주 후

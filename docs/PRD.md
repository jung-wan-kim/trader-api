# Trader API PRD (Product Requirements Document)

## 1. 개요

- **제품명**: Trader API
- **버전**: 1.0
- **작성일**: 2025-01-06
- **작성자**: Product Manager RP

## 2. 제품 비전 및 목표

### 2.1 문제 정의
- 개인 투자자들은 전문 트레이더의 전략을 이해하고 적용하는데 어려움을 겪고 있음
- 시장 데이터 분석에 많은 시간과 전문 지식이 필요함
- 체계적인 리스크 관리 없이 감정적 투자를 하는 경우가 많음
- 검증된 투자 전략에 대한 접근성이 제한적임

### 2.2 해결 방안
- Jesse Livermore, Larry Williams, Stan Weinstein 등 전설적인 트레이더들의 검증된 전략을 AI 기반으로 구현
- 실시간 시장 데이터 분석과 자동화된 매매 신호 제공
- 체계적인 리스크 관리 시스템 (손절가, 목표가, 포지션 사이즈 자동 계산)
- 구독 기반 서비스로 전문가 수준의 투자 전략 대중화

### 2.3 핵심 가치
- **전문성**: 검증된 전설적 트레이더들의 전략 구현
- **접근성**: 복잡한 투자 전략을 누구나 쉽게 활용
- **신뢰성**: 투명한 성과 추적과 백테스팅 결과 제공
- **안전성**: 체계적인 리스크 관리로 손실 최소화

## 3. 주요 사용자 스토리

### 3.1 초보 투자자 (Basic 구독자)
| ID | As a... | I want to... | So that... | 우선순위 |
|----|---------|--------------|------------|---------|
| US01 | 초보 투자자 | 검증된 매매 신호를 받고 싶다 | 전문가 수준의 투자 판단을 할 수 있다 | P0 |
| US02 | 초보 투자자 | 각 추천의 근거를 이해하고 싶다 | 투자 결정에 확신을 가질 수 있다 | P0 |
| US03 | 초보 투자자 | 리스크 관리 가이드를 받고 싶다 | 큰 손실을 피할 수 있다 | P0 |

### 3.2 경험 투자자 (Premium 구독자)
| ID | As a... | I want to... | So that... | 우선순위 |
|----|---------|--------------|------------|---------|
| US04 | 경험 투자자 | 여러 전략을 비교 분석하고 싶다 | 상황에 맞는 최적 전략을 선택할 수 있다 | P0 |
| US05 | 경험 투자자 | 포트폴리오 성과를 추적하고 싶다 | 투자 전략을 개선할 수 있다 | P1 |
| US06 | 경험 투자자 | 실시간 알림을 받고 싶다 | 매매 타이밍을 놓치지 않을 수 있다 | P0 |

### 3.3 전문 투자자 (Professional 구독자)
| ID | As a... | I want to... | So that... | 우선순위 |
|----|---------|--------------|------------|---------|
| US07 | 전문 투자자 | API를 통해 자동매매를 구현하고 싶다 | 24시간 시장을 모니터링할 수 있다 | P1 |
| US08 | 전문 투자자 | 커스텀 전략을 백테스팅하고 싶다 | 새로운 전략을 검증할 수 있다 | P2 |
| US09 | 전문 투자자 | 고급 기술적 지표를 활용하고 싶다 | 더 정교한 분석을 할 수 있다 | P2 |

## 4. 기능 요구사항

### 4.1 인증 및 사용자 관리
- **회원가입/로그인**: Supabase Auth 기반 JWT 인증
- **프로필 관리**: 사용자 정보, 투자 성향 설정
- **구독 관리**: Basic/Premium/Professional 티어 전환

### 4.2 전략별 추천 시스템

#### Jesse Livermore 전략 (추세 추종)
- **주요 지표**: 가격 모멘텀, 거래량 분석, 피봇 포인트
- **매매 신호**: 
  - 신고가 돌파 시 매수
  - 주요 지지선 이탈 시 매도
  - 피라미딩 전략 적용
- **리스크 관리**: 총 자산의 10% 이상 단일 포지션 금지

#### Larry Williams 전략 (단기 모멘텀)
- **주요 지표**: %R, 변동성 돌파, 시장 타이밍
- **매매 신호**:
  - 전일 변동폭의 0.5배 돌파 시 진입
  - 당일 청산 원칙
  - 과매수/과매도 구간 활용
- **리스크 관리**: 일일 최대 손실 한도 설정

#### Stan Weinstein 전략 (스테이지 분석)
- **주요 지표**: 30주 이동평균선, 상대강도, 거래량
- **매매 신호**:
  - Stage 2(상승기) 진입 시 매수
  - Stage 4(하락기) 진입 시 매도
  - 장기 포지션 위주
- **리스크 관리**: 30주 이동평균선 하향 돌파 시 손절

### 4.3 리스크 관리 시스템
- **자동 손절가 계산**: 진입가 대비 -3% ~ -7% 자동 설정
- **목표가 제안**: 리스크/리워드 비율 1:2 이상 유지
- **포지션 사이즈 계산**: Kelly Criterion 적용
- **포트폴리오 분산**: 섹터별, 전략별 분산 투자 가이드

### 4.4 포트폴리오 추적
- **실시간 손익 계산**: 포지션별, 전체 수익률 추적
- **성과 분석**: 
  - 전략별 수익률 비교
  - 승률, 손익비, 샤프 비율 계산
  - 월별/연도별 성과 리포트
- **거래 히스토리**: 모든 추천과 실제 거래 기록 보관

### 4.5 구독 시스템

#### Basic (무료)
- 일일 추천 3개 제한
- 기본 전략 1개 선택
- 주간 시장 리포트
- 광고 포함

#### Premium ($29/월)
- 무제한 추천
- 모든 전략 접근
- 실시간 알림
- 포트폴리오 추적
- 광고 제거

#### Professional ($99/월)
- Premium 모든 기능 포함
- API 접근권
- 백테스팅 도구
- 1:1 전략 컨설팅
- 우선 고객 지원

### 4.6 실시간 데이터 처리
- **시장 데이터 수집**: Finnhub API 연동
- **기술적 지표 계산**: 이동평균, RSI, MACD 등 20개 이상 지표
- **패턴 인식**: AI 기반 차트 패턴 인식
- **알림 시스템**: 웹소켓 기반 실시간 푸시 알림

## 5. 비기능 요구사항

### 5.1 성능
- **응답 시간**: API 평균 응답 시간 < 200ms
- **동시 사용자**: 10,000명 동시 접속 지원
- **데이터 처리**: 초당 1,000개 주식 데이터 처리
- **가용성**: 99.9% 이상 가동률

### 5.2 보안
- **인증**: JWT 토큰 기반 인증, 리프레시 토큰 구현
- **암호화**: HTTPS 필수, 민감 데이터 암호화 저장
- **API 보안**: Rate limiting, API key 관리
- **데이터 보호**: GDPR 준수, 개인정보 암호화

### 5.3 확장성
- **수평적 확장**: 로드 밸런서 + 다중 서버 구성
- **데이터베이스**: 읽기 전용 복제본 구성
- **캐싱**: Redis 기반 캐싱 레이어
- **마이크로서비스**: 추천 엔진 독립 서비스화

### 5.4 모니터링
- **APM**: New Relic 또는 DataDog 연동
- **로깅**: 중앙화된 로그 수집 (ELK Stack)
- **알림**: 장애 발생 시 즉시 알림
- **대시보드**: 실시간 시스템 상태 모니터링

## 6. API 엔드포인트 목록

### 인증 API
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/profile` - 프로필 조회
- `PUT /api/auth/profile` - 프로필 수정

### 전략 API
- `GET /api/strategies` - 전체 전략 목록
- `GET /api/strategies/:id` - 특정 전략 상세
- `GET /api/strategies/:id/performance` - 전략 성과
- `POST /api/strategies/:id/subscribe` - 전략 구독
- `DELETE /api/strategies/:id/subscribe` - 전략 구독 취소

### 추천 API
- `GET /api/recommendations` - 추천 목록 (필터링, 페이징)
- `GET /api/recommendations/:id` - 추천 상세
- `POST /api/recommendations/:id/like` - 추천 좋아요
- `GET /api/recommendations/live` - 실시간 추천 (WebSocket)

### 포트폴리오 API
- `GET /api/portfolio` - 포트폴리오 조회
- `POST /api/portfolio/positions` - 포지션 추가
- `PUT /api/portfolio/positions/:id` - 포지션 수정
- `DELETE /api/portfolio/positions/:id` - 포지션 삭제
- `GET /api/portfolio/performance` - 성과 분석
- `GET /api/portfolio/history` - 거래 내역

### 시장 데이터 API
- `GET /api/market/quote/:symbol` - 주식 시세
- `GET /api/market/candles/:symbol` - 캔들 차트 데이터
- `GET /api/market/indicators/:symbol` - 기술적 지표
- `GET /api/market/news/:symbol` - 관련 뉴스
- `GET /api/market/sentiment/:symbol` - 시장 심리 분석

### 구독 API
- `GET /api/subscription/plans` - 구독 플랜 목록
- `POST /api/subscription/subscribe` - 구독 시작
- `PUT /api/subscription/upgrade` - 구독 업그레이드
- `DELETE /api/subscription/cancel` - 구독 취소
- `GET /api/subscription/usage` - 사용량 조회

## 7. 성공 지표 (KPI)

### 사용자 지표
- **MAU (Monthly Active Users)**: 6개월 내 10,000명 달성
- **유료 전환율**: 무료 사용자의 15% 이상 유료 전환
- **이탈률**: 월간 이탈률 5% 미만 유지

### 비즈니스 지표
- **MRR (Monthly Recurring Revenue)**: 6개월 내 $50,000 달성
- **ARPU (Average Revenue Per User)**: $15 이상 유지
- **LTV/CAC**: 3:1 이상 유지

### 서비스 품질 지표
- **추천 정확도**: 60% 이상 수익 실현
- **평균 수익률**: 연 15% 이상
- **사용자 만족도**: NPS 40 이상

### 기술 지표
- **API 가동률**: 99.9% 이상
- **평균 응답 시간**: 200ms 이하
- **에러율**: 0.1% 미만

## 8. 릴리즈 계획

### Phase 1: MVP (2주)
- [x] 기본 인증 시스템
- [x] Jesse Livermore 전략 구현
- [x] 기본 추천 API
- [x] 포트폴리오 관리 기능
- [ ] 기본 웹 프론트엔드

### Phase 2: 전략 확장 (4주)
- [ ] Larry Williams 전략 구현
- [ ] Stan Weinstein 전략 구현
- [ ] 실시간 알림 시스템
- [ ] 성과 분석 대시보드
- [ ] 구독 시스템 구현

### Phase 3: 고급 기능 (6주)
- [ ] AI 패턴 인식 엔진
- [ ] 백테스팅 도구
- [ ] API 공개
- [ ] 모바일 앱 출시
- [ ] 자동매매 연동

### Phase 4: 확장 및 최적화 (8주)
- [ ] 국제 시장 지원
- [ ] 암호화폐 지원
- [ ] 소셜 트레이딩 기능
- [ ] 머신러닝 기반 개인화
- [ ] 엔터프라이즈 솔루션

## 9. 리스크 및 대응 방안

### 기술적 리스크
- **시장 데이터 API 장애**: 다중 데이터 소스 확보
- **서버 과부하**: 자동 스케일링 구현
- **보안 침해**: 정기 보안 감사, 버그 바운티 프로그램

### 비즈니스 리스크
- **규제 변화**: 법률 자문 확보, 컴플라이언스 체계 구축
- **경쟁사 출현**: 차별화된 전략과 빠른 혁신
- **시장 변동성**: 리스크 관리 시스템 강화

### 운영 리스크
- **핵심 인력 이탈**: 지식 문서화, 백업 인력 확보
- **고객 클레임**: 24시간 고객 지원 체계
- **데이터 손실**: 실시간 백업, 재해 복구 계획

## 10. 부록

### 용어 정의
- **피라미딩**: 수익이 발생한 포지션에 추가 매수하는 전략
- **손절가(Stop Loss)**: 손실을 제한하기 위한 자동 매도 가격
- **샤프 비율**: 위험 대비 수익률을 나타내는 지표
- **백테스팅**: 과거 데이터로 전략을 검증하는 과정

### 참고 자료
- Jesse Livermore, "Reminiscences of a Stock Operator"
- Larry Williams, "Long-Term Secrets to Short-Term Trading"
- Stan Weinstein, "Secrets for Profiting in Bull and Bear Markets"
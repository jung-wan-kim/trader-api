# 🚀 Trader API 빠른 시작 가이드

## 1️⃣ Supabase Service Role Key 가져오기

1. [Supabase 대시보드](https://app.supabase.com/project/lgebgddeerpxdjvtqvoi) 접속
2. **Settings** → **API** 메뉴로 이동
3. **Service role key (secret)** 복사
4. `.env` 파일의 `SUPABASE_SERVICE_ROLE_KEY` 값 교체

## 2️⃣ 서버 실행하기

```bash
# 의존성 설치 (이미 했다면 생략)
npm install

# 개발 서버 실행
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 3️⃣ API 테스트하기

### 헬스 체크
```bash
curl http://localhost:3000/health
```

### 사용자 등록
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User",
    "investmentStyle": "moderate"
  }'
```

### 로그인
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 주식 시세 조회 (로그인 후 받은 토큰 사용)
```bash
curl http://localhost:3000/api/market/quote/AAPL \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 4️⃣ 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회
- `POST /api/auth/logout` - 로그아웃

### 시장 데이터
- `GET /api/market/quote/:symbol` - 주식 시세
- `GET /api/market/candles/:symbol` - 캔들 차트 데이터
- `GET /api/market/news/:symbol` - 뉴스

### 전략 & 추천
- `GET /api/strategies` - 전략 목록
- `GET /api/recommendations` - AI 추천 목록
- `POST /api/recommendations/:id/apply` - 추천 적용

### 포트폴리오
- `POST /api/portfolio` - 포트폴리오 생성
- `GET /api/portfolio` - 포트폴리오 목록
- `POST /api/portfolio/:id/transaction` - 거래 추가

## 5️⃣ 문제 해결

### "Missing Supabase environment variables" 오류
→ `.env` 파일에 `SUPABASE_SERVICE_ROLE_KEY` 추가 필요

### "Cannot connect to Redis" 경고
→ Redis는 선택사항. 무시하거나 Redis 설치:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

### Finnhub API 제한
→ 무료 플랜은 분당 60개 요청 제한. 캐싱이 자동으로 적용됨.

## 📱 Flutter 앱과 연동

trader-app에서 API URL을 설정하세요:
```dart
// lib/config/api_config.dart
const String API_BASE_URL = 'http://localhost:3000/api';
```

## 🎉 준비 완료!

이제 Trader API가 실행 중입니다. trader-app과 연동하여 사용하세요!
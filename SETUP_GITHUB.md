# GitHub Repository 설정 가이드

## 1. GitHub에서 새 repository 생성

1. GitHub.com에 로그인
2. 우측 상단 '+' 버튼 → 'New repository' 클릭
3. Repository 정보 입력:
   - Repository name: `trader-api`
   - Description: "Backend API for Trader App - AI-powered stock recommendation service"
   - Public/Private 선택
   - **중요**: "Initialize this repository with:" 옵션들은 모두 체크 해제
4. 'Create repository' 클릭

## 2. 로컬 repository를 GitHub에 연결

터미널에서 다음 명령어 실행:

```bash
# 현재 디렉토리가 trader-api인지 확인
pwd
# 출력: /Users/jung-wankim/Project/trader-app/backend/trader-api

# GitHub remote 추가 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/trader-api.git

# 또는 SSH를 사용하는 경우
git remote add origin git@github.com:YOUR_USERNAME/trader-api.git

# remote 확인
git remote -v

# main 브랜치로 푸시
git push -u origin main
```

## 3. 환경 변수 설정 (GitHub Secrets)

Repository 설정에서 다음 Secrets 추가:
1. Settings → Secrets and variables → Actions
2. 다음 secrets 추가:
   - `DOCKER_USERNAME`: Docker Hub 사용자명
   - `DOCKER_PASSWORD`: Docker Hub 비밀번호

## 4. 로컬 개발 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집하여 실제 값 입력
# SUPABASE_URL, SUPABASE_ANON_KEY, FINNHUB_API_KEY 등

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 5. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 계정 생성
2. 새 프로젝트 생성
3. SQL Editor에서 `src/models/schema.sql` 실행
4. SQL Editor에서 `src/models/seed.sql` 실행 (선택사항)
5. Project Settings에서 API keys 복사하여 .env에 추가

## 6. 배포 옵션

### Heroku
```bash
heroku create your-trader-api-name
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your_url
# 기타 환경 변수 설정...
git push heroku main
```

### Railway
1. [Railway.app](https://railway.app) 계정 생성
2. GitHub repository 연결
3. 환경 변수 설정
4. 자동 배포

### Docker
```bash
docker build -t trader-api .
docker run -p 3000:3000 --env-file .env trader-api
```

## 7. API 테스트

```bash
# Health check
curl http://localhost:3000/health

# Register (테스트용)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 8. Flutter 앱 연동

Flutter 앱의 `lib/config/api_config.dart`:

```dart
class ApiConfig {
  static const String baseUrl = 'https://your-trader-api.herokuapp.com';
  // 또는 로컬 개발: 'http://localhost:3000'
}
```

---

**주의사항**:
- `.env` 파일은 절대 Git에 커밋하지 마세요
- 프로덕션 환경에서는 HTTPS를 사용하세요
- Rate limiting과 CORS 설정을 확인하세요
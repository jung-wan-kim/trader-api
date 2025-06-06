# Trader API 배포 가이드

## 🚀 백엔드 코드 분리 및 배포

trader-api 백엔드 코드를 별도의 GitHub repository로 분리하려면 다음 단계를 따르세요:

### 1. 새 디렉토리에 코드 복사

```bash
# 프로젝트 디렉토리 밖에서 실행
cd ~/Project
cp -r trader-app/backend/trader-api ./trader-api-standalone
cd trader-api-standalone
```

### 2. Git 저장소 초기화

```bash
git init
git branch -m main
git add .
git commit -m "Initial commit: Trader API backend"
```

### 3. GitHub 저장소 생성 및 푸시

```bash
# GitHub에서 'trader-api' 저장소를 먼저 생성한 후
git remote add origin https://github.com/yourusername/trader-api.git
git push -u origin main
```

### 4. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

### 5. 의존성 설치 및 실행

```bash
npm install
npm run dev  # 개발 모드
npm start    # 프로덕션 모드
```

## 🌐 배포 옵션

### Heroku 배포

```bash
heroku create your-trader-api
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key
# 기타 환경 변수 설정...
git push heroku main
```

### Docker 배포

```bash
docker build -t trader-api .
docker run -p 3000:3000 --env-file .env trader-api
```

### Railway 배포

1. [Railway](https://railway.app) 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포

## 📝 Flutter 앱 연동

Flutter 앱에서 백엔드 API를 사용하려면:

1. `lib/config/api_config.dart` 파일 생성:

```dart
class ApiConfig {
  static const String baseUrl = 'https://your-api-url.com';
  // 또는 개발 중일 때: 'http://localhost:3000'
}
```

2. HTTP 요청 시 baseUrl 사용:

```dart
final response = await http.get(
  Uri.parse('${ApiConfig.baseUrl}/api/recommendations'),
  headers: {
    'Authorization': 'Bearer $token',
  },
);
```

## 🔐 보안 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- API 키와 비밀번호는 환경 변수로 관리하세요
- HTTPS를 사용하여 통신을 암호화하세요
- Rate limiting과 CORS를 적절히 설정하세요
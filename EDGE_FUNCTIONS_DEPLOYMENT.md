# 🚀 Edge Functions 배포 가이드

## 📌 중요 정보

Edge Functions는 보안상의 이유로 **Supabase CLI** 또는 **Supabase Dashboard**를 통해서만 배포할 수 있습니다. API를 통한 직접 배포는 지원되지 않습니다.

## 🛠️ 배포 방법

### 방법 1: Supabase Dashboard (가장 쉬움)

1. **Supabase Dashboard 접속**
   ```
   https://app.supabase.com/project/lgebgddeerpxdjvtqvoi/functions
   ```

2. **새 함수 생성**
   - "New Function" 버튼 클릭
   - 함수 이름 입력 (예: `market-data`)
   - 코드 에디터에 `/supabase/functions/market-data/index.ts` 내용 복사/붙여넣기

3. **환경 변수 설정**
   - Settings → Secrets 탭
   - 다음 변수 추가:
     ```
     FINNHUB_API_KEY=d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
     ```

4. **배포**
   - "Deploy" 버튼 클릭

### 방법 2: Supabase CLI

#### 1. Supabase CLI 설치

**macOS:**
```bash
brew install supabase/tap/supabase
```

**npm:**
```bash
npm install -g supabase
```

**또는 직접 다운로드:**
```bash
# macOS (Apple Silicon)
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/
```

#### 2. 프로젝트 연결

```bash
cd /Users/jung-wankim/Project/trader-api

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref lgebgddeerpxdjvtqvoi
```

#### 3. Secrets 설정

```bash
supabase secrets set FINNHUB_API_KEY=d11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg
```

#### 4. Functions 배포

```bash
# 개별 함수 배포
supabase functions deploy market-data
supabase functions deploy trading-signals
supabase functions deploy portfolio-management

# 또는 모든 함수 한번에 배포
supabase functions deploy
```

### 방법 3: 로컬 개발 및 테스트

#### 1. 로컬 Supabase 시작

```bash
supabase start
```

#### 2. 로컬에서 함수 실행

```bash
supabase functions serve market-data --env-file ./supabase/.env.local
```

#### 3. 로컬 테스트

```bash
# 로컬 함수 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/market-data' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZWJnZGRlZXJweGRqdnRxdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxOTc2MDksImV4cCI6MjA2NDc3MzYwOX0.NZxHOwzgRc-Vjw60XktU7L_hKiIMAW_5b_DHis6qKBE' \
  --header 'Content-Type: application/json' \
  --data '{"action":"quote","symbol":"AAPL"}'
```

## 📝 함수별 엔드포인트

배포 후 다음 엔드포인트를 사용할 수 있습니다:

### 1. Market Data
```
POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/market-data
```

**요청 예시:**
```json
{
  "action": "quote",
  "symbol": "AAPL"
}
```

### 2. Trading Signals
```
POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/trading-signals
```

**요청 예시:**
```json
{
  "symbol": "AAPL",
  "strategy": "jesse_livermore",
  "timeframe": "D"
}
```

### 3. Portfolio Management
```
POST https://lgebgddeerpxdjvtqvoi.supabase.co/functions/v1/portfolio-management
```

**요청 예시:**
```json
{
  "action": "create_position",
  "portfolioId": "uuid-here",
  "data": {
    "symbol": "AAPL",
    "side": "long",
    "quantity": 100,
    "entry_price": 150.00
  }
}
```

## 🔍 디버깅

### 로그 확인

```bash
# 실시간 로그
supabase functions logs market-data --tail

# 특정 시간 범위 로그
supabase functions logs market-data --since 1h
```

### 함수 상태 확인

```bash
supabase functions list
```

## ⚠️ 주의사항

1. **CORS 설정**: Edge Functions는 기본적으로 CORS가 활성화되어 있습니다.
2. **실행 시간 제한**: 기본 10초, 최대 150초
3. **메모리 제한**: 기본 256MB
4. **Cold Start**: 첫 실행 시 1-2초 지연 발생 가능

## 🚨 문제 해결

### "Command not found: supabase"
```bash
# npm으로 재설치
npm install -g supabase

# 또는 PATH 확인
echo $PATH
which supabase
```

### "Project not linked"
```bash
supabase link --project-ref lgebgddeerpxdjvtqvoi --password [DB_PASSWORD]
```

### "Invalid JWT"
- Authorization 헤더에 올바른 anon key 사용 확인
- Bearer 접두사 포함 확인

## 📞 지원

문제가 발생하면:
1. [Supabase Discord](https://discord.supabase.com/)
2. [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
3. [공식 문서](https://supabase.com/docs/guides/functions)
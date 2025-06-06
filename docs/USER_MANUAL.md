# Trader API 사용자 매뉴얼

## 목차
- [시작하기](#시작하기)
- [인증 방법](#인증-방법)
- [API 사용 가이드](#api-사용-가이드)
- [구독 플랜](#구독-플랜)
- [코드 예제](#코드-예제)
- [에러 처리](#에러-처리)
- [제한사항](#제한사항)
- [FAQ](#faq)

## 시작하기

Trader API는 AI 기반 주식 투자 추천 서비스를 제공하는 RESTful API입니다. 실시간 시장 데이터, 개인화된 투자 추천, 포트폴리오 관리 기능을 제공합니다.

### 기본 정보
- **Base URL**: `https://api.trader-app.com/api/v1`
- **프로토콜**: HTTPS
- **응답 형식**: JSON
- **문자 인코딩**: UTF-8

### API 문서 접근
- **Swagger UI**: `https://api.trader-app.com/docs`
- **OpenAPI 스펙**: `https://api.trader-app.com/api-docs`

## 인증 방법

### 1. 회원가입

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "홍길동",
  "investmentStyle": "moderate"
}
```

**응답:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "홍길동",
    "investment_style": "moderate"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.MRjVnEiJoYaqSn-XNH67AA...",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

### 2. 로그인

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### 3. API 호출 시 인증 헤더 사용

모든 보호된 엔드포인트 호출 시 Authorization 헤더에 토큰을 포함합니다:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 토큰 갱신

액세스 토큰이 만료되면 refresh token을 사용하여 새로운 토큰을 발급받습니다:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "v1.MRjVnEiJoYaqSn-XNH67AA..."
}
```

## API 사용 가이드

### 1. 실시간 주식 시세 조회

```http
GET /api/v1/market/quote/AAPL
```

**응답:**
```json
{
  "data": {
    "symbol": "AAPL",
    "current": 150.25,
    "change": 2.15,
    "percentChange": 1.45,
    "high": 152.30,
    "low": 148.90,
    "open": 149.50,
    "previousClose": 148.10,
    "timestamp": 1640995200
  }
}
```

### 2. 차트 데이터 조회

```http
GET /api/v1/market/candles/AAPL?resolution=D&from=1640908800&to=1640995200
```

**응답:**
```json
{
  "data": {
    "o": [149.50, 150.00, 148.75],
    "h": [152.30, 151.25, 150.50],
    "l": [148.90, 149.00, 147.25],
    "c": [150.25, 149.75, 150.00],
    "v": [85430000, 92150000, 78920000],
    "t": [1640908800, 1640995200, 1641081600],
    "s": "ok"
  }
}
```

### 3. 투자 추천 조회

```http
GET /api/v1/recommendations?limit=10&confidence_min=70
Authorization: Bearer your-access-token
```

**응답:**
```json
{
  "data": [
    {
      "id": "rec_123456",
      "symbol": "AAPL",
      "action": "buy",
      "confidence": 85,
      "target_price": 160.00,
      "stop_loss": 145.00,
      "risk_level": "medium",
      "time_horizon": "medium",
      "reasoning": "강력한 실적 성장과 긍정적인 기술적 지표를 바탕으로 매수 추천",
      "strategy": {
        "id": "jesse-livermore",
        "name": "Jesse Livermore Strategy",
        "type": "momentum"
      },
      "created_at": "2024-01-01T10:00:00Z",
      "expires_at": "2024-01-02T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### 4. 포트폴리오 조회

```http
GET /api/v1/portfolio
Authorization: Bearer your-access-token
```

**응답:**
```json
{
  "data": [
    {
      "id": "portfolio_123",
      "name": "Main Portfolio",
      "initial_capital": 10000,
      "current_value": 12500,
      "cash_balance": 2500,
      "total_profit_loss": 2500,
      "total_profit_loss_percentage": 25.0,
      "positions": [
        {
          "id": "pos_456",
          "symbol": "AAPL",
          "quantity": 100,
          "entry_price": 145.50,
          "current_price": 150.25,
          "unrealized_pl": 475.00,
          "unrealized_pl_percent": 3.26,
          "status": "open",
          "entry_date": "2024-01-01T09:30:00Z"
        }
      ],
      "created_at": "2023-12-01T00:00:00Z"
    }
  ]
}
```

### 5. 새로운 포지션 추가

```http
POST /api/v1/portfolio/portfolio_123/positions
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "symbol": "GOOGL",
  "quantity": 50,
  "entry_price": 145.20,
  "entry_date": "2024-01-01T14:30:00Z"
}
```

## 구독 플랜

### Basic 플랜 (무료)
- **일일 추천 제한**: 3개
- **사용 가능 전략**: Jesse Livermore Strategy만
- **포트폴리오**: 1개
- **API 호출 제한**: 100 요청/시간

### Premium 플랜 ($29/월)
- **일일 추천 제한**: 50개
- **사용 가능 전략**: 모든 전략 (모멘텀, 리버설, 스윙 등)
- **포트폴리오**: 5개
- **API 호출 제한**: 1,000 요청/시간
- **실시간 알림**: 지원

### Professional 플랜 ($99/월)
- **일일 추천 제한**: 무제한
- **사용 가능 전략**: 모든 전략 + 고급 분석
- **포트폴리오**: 무제한
- **API 호출 제한**: 10,000 요청/시간
- **우선 지원**: 24/7 지원

## 코드 예제

### JavaScript/Node.js

```javascript
const axios = require('axios');

class TraderAPI {
  constructor(accessToken) {
    this.baseURL = 'https://api.trader-app.com/api/v1';
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 실시간 시세 조회
  async getQuote(symbol) {
    try {
      const response = await this.client.get(`/market/quote/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quote:', error.response?.data);
      throw error;
    }
  }

  // 투자 추천 조회
  async getRecommendations(options = {}) {
    try {
      const params = new URLSearchParams(options);
      const response = await this.client.get(`/recommendations?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error.response?.data);
      throw error;
    }
  }

  // 포트폴리오 조회
  async getPortfolios() {
    try {
      const response = await this.client.get('/portfolio');
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolios:', error.response?.data);
      throw error;
    }
  }
}

// 사용 예제
async function example() {
  const api = new TraderAPI('your-access-token');
  
  // Apple 주식 시세 조회
  const appleQuote = await api.getQuote('AAPL');
  console.log('Apple Current Price:', appleQuote.data.current);
  
  // 고신뢰도 추천 조회
  const recommendations = await api.getRecommendations({
    confidence_min: 80,
    limit: 5
  });
  console.log('High confidence recommendations:', recommendations.data.length);
  
  // 포트폴리오 현재 상태
  const portfolios = await api.getPortfolios();
  console.log('Total portfolio value:', portfolios.data[0].current_value);
}
```

### Python

```python
import requests
import json

class TraderAPI:
    def __init__(self, access_token):
        self.base_url = 'https://api.trader-app.com/api/v1'
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    def get_quote(self, symbol):
        """실시간 주식 시세 조회"""
        url = f'{self.base_url}/market/quote/{symbol}'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_recommendations(self, **kwargs):
        """투자 추천 조회"""
        url = f'{self.base_url}/recommendations'
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()
    
    def get_portfolios(self):
        """포트폴리오 조회"""
        url = f'{self.base_url}/portfolio'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def add_position(self, portfolio_id, symbol, quantity, entry_price):
        """새로운 포지션 추가"""
        url = f'{self.base_url}/portfolio/{portfolio_id}/positions'
        data = {
            'symbol': symbol,
            'quantity': quantity,
            'entry_price': entry_price
        }
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

# 사용 예제
def main():
    api = TraderAPI('your-access-token')
    
    # Tesla 주식 시세 조회
    tesla_quote = api.get_quote('TSLA')
    print(f"Tesla Current Price: ${tesla_quote['data']['current']}")
    
    # 매수 추천만 조회
    buy_recommendations = api.get_recommendations(
        action='buy',
        confidence_min=75,
        limit=10
    )
    print(f"Buy recommendations: {len(buy_recommendations['data'])}")
    
    # 새로운 포지션 추가 (예시)
    # result = api.add_position('portfolio_123', 'MSFT', 25, 300.50)
    # print(f"Position added: {result['message']}")

if __name__ == '__main__':
    main()
```

### cURL

```bash
# 회원가입
curl -X POST https://api.trader-app.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "홍길동",
    "investmentStyle": "moderate"
  }'

# 로그인
curl -X POST https://api.trader-app.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'

# 주식 시세 조회 (인증 불필요)
curl https://api.trader-app.com/api/v1/market/quote/AAPL

# 투자 추천 조회 (인증 필요)
curl -H "Authorization: Bearer your-access-token" \
  https://api.trader-app.com/api/v1/recommendations?limit=5&confidence_min=80

# 포트폴리오 조회
curl -H "Authorization: Bearer your-access-token" \
  https://api.trader-app.com/api/v1/portfolio
```

## 에러 처리

### 일반적인 HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 429 | Too Many Requests | 요청 한도 초과 |
| 500 | Internal Server Error | 서버 오류 |

### 에러 응답 형식

```json
{
  "error": "Authentication Error",
  "message": "Invalid or expired token",
  "code": "AUTH_TOKEN_EXPIRED",
  "timestamp": "2024-01-01T10:00:00Z",
  "details": {
    "token_expires_at": "2024-01-01T09:00:00Z"
  }
}
```

### 주요 에러 코드

| 코드 | 설명 | 해결 방법 |
|------|------|-----------|
| `AUTH_TOKEN_EXPIRED` | 토큰 만료 | refresh token으로 새 토큰 발급 |
| `RATE_LIMIT_EXCEEDED` | API 호출 한도 초과 | 잠시 후 재시도 |
| `INSUFFICIENT_SUBSCRIPTION` | 구독 권한 부족 | 구독 업그레이드 필요 |
| `MARKET_DATA_UNAVAILABLE` | 시장 데이터 없음 | 시장 시간 확인 또는 다른 심볼 시도 |
| `PORTFOLIO_NOT_FOUND` | 포트폴리오 없음 | 올바른 포트폴리오 ID 확인 |

### 에러 처리 예제

```javascript
try {
  const response = await api.getRecommendations();
  console.log(response.data);
} catch (error) {
  if (error.response?.status === 401) {
    // 토큰 만료 - 재로그인 필요
    console.log('Token expired, please login again');
    await login();
  } else if (error.response?.status === 429) {
    // Rate limit 초과 - 잠시 대기 후 재시도
    console.log('Rate limit exceeded, waiting...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    // 재시도 로직
  } else if (error.response?.data?.code === 'INSUFFICIENT_SUBSCRIPTION') {
    // 구독 업그레이드 필요
    console.log('Please upgrade your subscription');
  } else {
    console.error('Unexpected error:', error.response?.data);
  }
}
```

## 제한사항

### API 호출 제한 (Rate Limiting)

| 엔드포인트 그룹 | Basic | Premium | Professional |
|----------------|-------|---------|--------------|
| 인증 관련 | 5 요청/분 | 5 요청/분 | 5 요청/분 |
| 시장 데이터 | 100 요청/시간 | 500 요청/시간 | 2,000 요청/시간 |
| 추천/포트폴리오 | 50 요청/시간 | 500 요청/시간 | 5,000 요청/시간 |

### 데이터 제한사항

- **시장 데이터**: 실시간 데이터는 15분 지연 (Professional 플랜은 실시간)
- **과거 데이터**: 최대 2년간 데이터 제공
- **추천 보관**: 추천 데이터는 30일간 보관
- **포트폴리오**: 포지션 개수 제한 없음 (Basic: 50개, Premium: 500개, Professional: 무제한)

### 지원 시장

현재 지원하는 시장:
- **미국 주식시장**: NYSE, NASDAQ
- **주요 ETF**: S&P 500, 기술주, 섹터별 ETF
- **암호화폐**: 주요 코인 (향후 지원 예정)

## FAQ

### Q1: API 키는 어떻게 관리하나요?
A: 현재는 JWT 토큰 기반 인증을 사용합니다. 액세스 토큰은 24시간 유효하며, refresh token을 사용하여 갱신할 수 있습니다.

### Q2: 실시간 데이터를 받을 수 있나요?
A: Professional 플랜에서는 실시간 데이터를 제공하며, Basic/Premium 플랜에서는 15분 지연 데이터를 제공합니다.

### Q3: API 호출 한도를 초과하면 어떻게 되나요?
A: HTTP 429 상태 코드와 함께 에러가 반환됩니다. `Retry-After` 헤더를 확인하여 언제 재시도할 수 있는지 확인하세요.

### Q4: 모바일 앱에서 사용할 수 있나요?
A: 네, 모든 플랫폼에서 사용 가능한 RESTful API입니다. CORS가 설정되어 있어 웹 애플리케이션에서도 직접 호출 가능합니다.

### Q5: 백테스팅 데이터를 제공하나요?
A: 현재는 과거 2년간의 가격 데이터를 제공합니다. 전문적인 백테스팅 기능은 향후 추가 예정입니다.

### Q6: 구독을 취소하면 데이터는 어떻게 되나요?
A: 구독 취소 후에도 계정 데이터는 보존되며, Basic 플랜 기능은 계속 사용할 수 있습니다.

### Q7: API 응답 시간은 어느 정도인가요?
A: 평균 응답 시간은 다음과 같습니다:
- 시장 데이터: 100-200ms
- 추천 데이터: 200-500ms
- 포트폴리오 데이터: 150-300ms

### Q8: 웹훅이나 실시간 알림을 지원하나요?
A: 현재는 지원하지 않으며, 향후 버전에서 WebSocket 기반 실시간 알림을 제공할 예정입니다.

### Q9: 다른 언어의 SDK를 제공하나요?
A: 현재는 RESTful API만 제공하며, 향후 Python, JavaScript, Java용 공식 SDK 개발을 계획하고 있습니다.

### Q10: 기술 지원은 어떻게 받나요?
A: 
- Basic/Premium: 이메일 지원 (24-48시간 응답)
- Professional: 우선 이메일 지원 + 전화 지원 (24/7)
- 개발 관련 문의: dev-support@trader-api.com

---

## 연락처 및 지원

- **기술 지원**: support@trader-api.com
- **개발자 문의**: dev-support@trader-api.com
- **버그 신고**: GitHub Issues
- **문서 피드백**: docs@trader-api.com

더 자세한 API 명세는 [Swagger 문서](https://api.trader-app.com/docs)를 참조하세요.

**문서 버전**: 1.0.0  
**최종 업데이트**: 2024년 6월
# Trader API User Manual

## Table of Contents
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Usage Guide](#api-usage-guide)
- [Subscription Plans](#subscription-plans)
- [Code Examples](#code-examples)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [FAQ](#faq)

## Getting Started

Trader API is a RESTful API service that provides AI-powered stock investment recommendations. It offers real-time market data, personalized investment recommendations, and portfolio management features.

### Basic Information
- **Base URL**: `https://api.trader-app.com/api/v1`
- **Protocol**: HTTPS
- **Response Format**: JSON
- **Character Encoding**: UTF-8

### API Documentation Access
- **Swagger UI**: `https://api.trader-app.com/docs`
- **OpenAPI Specification**: `https://api.trader-app.com/api-docs`

## Authentication

### 1. User Registration

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "investmentStyle": "moderate"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
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

### 2. User Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### 3. Using Authentication Headers for API Calls

Include the token in the Authorization header for all protected endpoints:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Token Refresh

When the access token expires, use the refresh token to obtain a new token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "v1.MRjVnEiJoYaqSn-XNH67AA..."
}
```

## API Usage Guide

### 1. Real-time Stock Quote

```http
GET /api/v1/market/quote/AAPL
```

**Response:**
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

### 2. Chart Data

```http
GET /api/v1/market/candles/AAPL?resolution=D&from=1640908800&to=1640995200
```

### 3. Investment Recommendations

```http
GET /api/v1/recommendations?limit=10&confidence_min=70
Authorization: Bearer your-access-token
```

**Response:**
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
      "reasoning": "Strong earnings growth and positive technical indicators suggest a buy recommendation",
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

## Subscription Plans

### Basic Plan (Free)
- **Daily Recommendations**: 3 recommendations
- **Available Strategies**: Jesse Livermore Strategy only
- **Portfolios**: 1 portfolio
- **API Rate Limit**: 100 requests/hour

### Premium Plan ($29/month)
- **Daily Recommendations**: 50 recommendations
- **Available Strategies**: All strategies (Momentum, Reversal, Swing, etc.)
- **Portfolios**: 5 portfolios
- **API Rate Limit**: 1,000 requests/hour
- **Real-time Notifications**: Supported

### Professional Plan ($99/month)
- **Daily Recommendations**: Unlimited
- **Available Strategies**: All strategies + Advanced analytics
- **Portfolios**: Unlimited
- **API Rate Limit**: 10,000 requests/hour
- **Priority Support**: 24/7 support

## Code Examples

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

  // Get real-time quote
  async getQuote(symbol) {
    try {
      const response = await this.client.get(`/market/quote/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quote:', error.response?.data);
      throw error;
    }
  }

  // Get investment recommendations
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
}

// Usage example
async function example() {
  const api = new TraderAPI('your-access-token');
  
  // Get Apple stock quote
  const appleQuote = await api.getQuote('AAPL');
  console.log('Apple Current Price:', appleQuote.data.current);
  
  // Get high confidence recommendations
  const recommendations = await api.getRecommendations({
    confidence_min: 80,
    limit: 5
  });
  console.log('High confidence recommendations:', recommendations.data.length);
}
```

### Python

```python
import requests

class TraderAPI:
    def __init__(self, access_token):
        self.base_url = 'https://api.trader-app.com/api/v1'
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    def get_quote(self, symbol):
        """Get real-time stock quote"""
        url = f'{self.base_url}/market/quote/{symbol}'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_recommendations(self, **kwargs):
        """Get investment recommendations"""
        url = f'{self.base_url}/recommendations'
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()

# Usage example
def main():
    api = TraderAPI('your-access-token')
    
    # Get Tesla stock quote
    tesla_quote = api.get_quote('TSLA')
    print(f"Tesla Current Price: ${tesla_quote['data']['current']}")
    
    # Get buy recommendations only
    buy_recommendations = api.get_recommendations(
        action='buy',
        confidence_min=75,
        limit=10
    )
    print(f"Buy recommendations: {len(buy_recommendations['data'])}")
```

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request |
| 401 | Unauthorized | Authentication failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

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

## Rate Limits

### API Rate Limits by Plan

| Endpoint Group | Basic | Premium | Professional |
|----------------|-------|---------|--------------|
| Authentication | 5 requests/minute | 5 requests/minute | 5 requests/minute |
| Market Data | 100 requests/hour | 500 requests/hour | 2,000 requests/hour |
| Recommendations/Portfolio | 50 requests/hour | 500 requests/hour | 5,000 requests/hour |

## FAQ

### Q1: How do I manage API keys?
A: We currently use JWT token-based authentication. Access tokens are valid for 24 hours and can be refreshed using refresh tokens.

### Q2: Can I get real-time data?
A: Professional plans provide real-time data, while Basic/Premium plans provide data with a 15-minute delay.

### Q3: What happens if I exceed the API rate limit?
A: You'll receive an HTTP 429 status code with an error. Check the `Retry-After` header to see when you can retry.

### Q4: Can I use this in mobile apps?
A: Yes, it's a RESTful API that works on all platforms. CORS is configured for web applications as well.

### Q5: Do you provide backtesting data?
A: We currently provide up to 2 years of historical price data. Professional backtesting features are planned for future releases.

---

## Contact & Support

- **Technical Support**: support@trader-api.com
- **Developer Inquiries**: dev-support@trader-api.com
- **Bug Reports**: GitHub Issues
- **Documentation Feedback**: docs@trader-api.com

For detailed API specifications, please refer to the [Swagger Documentation](https://api.trader-app.com/docs).

**Document Version**: 1.0.0  
**Last Updated**: June 2024
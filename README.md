# Trader API

Backend API for Trader App - AI-powered stock recommendation service based on legendary traders' strategies.

## 🚀 Features

- **Stock Recommendations API**: Get AI-powered stock recommendations
- **Real-time Market Data**: Integration with Finnhub for live market data
- **Portfolio Management**: Track and manage user portfolios
- **Trading Strategies**: Access legendary traders' strategies
- **Authentication**: Secure JWT-based authentication
- **Rate Limiting**: Protect API from abuse
- **Caching**: Efficient data caching for improved performance

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account
- Finnhub API key

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trader-api.git
cd trader-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your credentials

5. Run database migrations:
```bash
npm run migrate
```

## 🏃‍♂️ Running the Application

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Stock Recommendations

#### Get Recommendations
```http
GET /api/recommendations
Authorization: Bearer <token>
```

#### Get Single Recommendation
```http
GET /api/recommendations/:id
Authorization: Bearer <token>
```

### Market Data

#### Get Stock Quote
```http
GET /api/market/quote/:symbol
Authorization: Bearer <token>
```

#### Get Stock Candles
```http
GET /api/market/candles/:symbol?from=2024-01-01&to=2024-01-31&resolution=D
Authorization: Bearer <token>
```

### Portfolio

#### Get Portfolio
```http
GET /api/portfolio
Authorization: Bearer <token>
```

#### Add Position
```http
POST /api/portfolio/positions
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "quantity": 100,
  "price": 150.00,
  "type": "BUY"
}
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 📁 Project Structure

```
trader-api/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── server.js       # Entry point
├── tests/              # Test files
├── .env.example        # Environment variables example
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
└── README.md           # Project documentation
```

## 🔒 Security

- JWT-based authentication
- Rate limiting on all endpoints
- Input validation using Joi
- Helmet.js for security headers
- CORS configuration

## 🚀 Deployment

### Heroku
```bash
heroku create trader-api
heroku config:set NODE_ENV=production
git push heroku main
```

### Docker
```bash
docker build -t trader-api .
docker run -p 3000:3000 trader-api
```

## 📊 Monitoring

- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Trader App Team

## 🙏 Acknowledgments

- Jesse Livermore trading strategies
- Larry Williams trading patterns
- Stan Weinstein market analysis
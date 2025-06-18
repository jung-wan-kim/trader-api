# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Trader API codebase. This document serves as the primary reference for understanding project architecture, development workflows, and best practices.

## Project Overview

**Trader API** is an AI-powered stock recommendation backend that implements proven trading strategies from legendary investors:

- **Jesse Livermore**: Trend following and momentum-based strategies
- **Larry Williams**: Short-term momentum with volatility indicators  
- **Stan Weinstein**: Stage analysis for market timing

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript support
- **Framework**: Express.js with middleware architecture
- **Database**: Supabase (PostgreSQL + Auth + Real-time + Storage)
- **External APIs**: Finnhub for market data
- **Authentication**: JWT-based with Supabase Auth
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI 3.0

## Quick Start

### Prerequisites
```bash
# Required tools
node --version  # >= 18.0.0
npm --version   # >= 8.0.0

# Required accounts
- Supabase account with project
- Finnhub API key
```

### Initial Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run in development
npm run dev
```

## Essential Commands

### Development
```bash
npm run dev          # Start with nodemon (auto-reload)
npm run dev:js       # JavaScript-only development mode
npm run build        # Compile TypeScript to JavaScript
npm run build:clean  # Clean build (removes dist/)
npm run watch        # Watch mode for TypeScript compilation
npm start            # Production mode (requires build)
```

### Testing
```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:controllers   # Controller tests
npm run test:services      # Service tests
npm run test:middleware    # Middleware tests
npm run test:security      # Security-focused tests
npm run test:verbose       # Detailed test output
npm run test:silent        # Minimal output
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
```

### Documentation
```bash
npm run docs:generate  # Generate docs from code
npm run docs:serve     # Serve docs locally
npm run docs:build     # Build docs for production
```

## Project Structure

```
trader-api/
├── src/                      # Source code
│   ├── config/              # Configuration modules
│   │   ├── database.js      # Database connection
│   │   ├── environment.js   # Environment variables
│   │   ├── supabase.js/ts   # Supabase client
│   │   └── swagger.js       # API documentation
│   ├── controllers/         # Request handlers
│   │   ├── authController.js/ts
│   │   ├── marketController.js
│   │   ├── portfolioController.js
│   │   ├── recommendationController.js
│   │   ├── strategyController.js
│   │   └── subscriptionController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js/ts       # JWT authentication
│   │   ├── errorHandler.js  # Global error handling
│   │   ├── rateLimiter.js/ts # API rate limiting
│   │   └── security.js      # Security headers
│   ├── models/              # Database schemas
│   │   ├── schema.sql       # Database structure
│   │   └── seed.sql         # Initial data
│   ├── routes/              # API routes
│   │   ├── auth.js/ts       # /api/auth/*
│   │   ├── market.ts        # /api/market/*
│   │   ├── portfolio.ts     # /api/portfolio/*
│   │   ├── recommendations.ts # /api/recommendations/*
│   │   ├── strategies.ts    # /api/strategies/*
│   │   └── subscription.js  # /api/subscription/*
│   ├── services/            # External integrations
│   │   └── finnhubService.js # Market data API
│   ├── types/               # TypeScript definitions
│   │   ├── index.ts         # Main type exports
│   │   ├── services.ts      # Service interfaces
│   │   └── *.d.ts           # Type declarations
│   ├── utils/               # Utility functions
│   │   ├── logger.ts        # Winston logger
│   │   ├── metrics.js       # Performance metrics
│   │   └── secrets.js       # Secret management
│   ├── validators/          # Input validation
│   │   └── *.js             # Joi validators
│   └── server.js/ts         # Application entry point
├── supabase/                # Supabase configuration
│   ├── functions/           # Edge Functions
│   │   ├── market-data/     # Market data processing
│   │   ├── portfolio-management/
│   │   ├── trading-signals/ # Strategy signals
│   │   └── tradingview-webhook/ # TradingView integration
│   └── migrations/          # Database migrations
├── tests/                   # Test files
│   ├── controllers/         # Controller tests
│   ├── integration/         # Integration tests
│   ├── middleware/          # Middleware tests
│   ├── services/            # Service tests
│   └── setup.js/ts          # Test configuration
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System design
│   ├── DEVELOPER_GUIDE.md   # Development guide
│   └── openapi.yaml         # API specification
└── scripts/                 # Utility scripts
    ├── deploy-edge-functions.js
    └── generate-docs.js
```

## Architecture Overview

### Design Patterns

1. **MVC Architecture**
   ```
   Routes → Middleware → Controllers → Services → Database
   ```

2. **Middleware Pipeline**
   ```
   Request → Security → Auth → Validation → RateLimit → Controller → Response
   ```

3. **Service Layer Pattern**
   - Controllers handle HTTP logic
   - Services contain business logic
   - Clear separation of concerns

4. **Error Handling**
   - Centralized error middleware
   - Consistent error response format
   - Proper HTTP status codes

### Database Architecture

#### Core Tables
- **users**: User accounts and profiles
- **portfolios**: User investment portfolios
- **positions**: Stock positions in portfolios
- **recommendations**: AI-generated recommendations
- **strategies**: Trading strategy definitions
- **subscriptions**: User subscription tiers

#### Supabase Features Used
- **Authentication**: Built-in auth with JWT
- **Row Level Security**: Fine-grained access control
- **Real-time**: Live data subscriptions
- **Edge Functions**: Serverless compute

### API Design

#### RESTful Endpoints
```
/api/auth
  POST   /register         # Create account
  POST   /login           # Authenticate
  POST   /refresh         # Refresh token
  GET    /profile         # Get user profile
  PUT    /profile         # Update profile

/api/market
  GET    /quote/:symbol   # Real-time quote
  GET    /candles/:symbol # Historical data
  GET    /search          # Symbol search

/api/recommendations
  GET    /                # List recommendations
  GET    /:id            # Get specific
  POST   /:id/feedback   # User feedback

/api/portfolio
  GET    /               # List portfolios
  POST   /               # Create portfolio
  GET    /:id/positions  # List positions
  POST   /:id/positions  # Add position
```

#### Response Format
```json
// Success
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2024-01-01T00:00:00Z"
}

// Error
{
  "error": "ValidationError",
  "message": "Invalid input",
  "code": "VALIDATION_ERROR",
  "details": { ... }
}
```

## Development Workflow

### TypeScript Migration
The project is partially migrated to TypeScript:
- **Completed**: Core types, auth, rate limiter
- **In Progress**: Controllers, services
- **JavaScript**: Legacy code still functional

### Git Workflow
```bash
# Feature development
git checkout -b feature/your-feature
npm run typecheck
npm test
git commit -m "feat: description"

# Before pushing
npm run lint:fix
npm run test:coverage
```

### Testing Strategy

1. **Unit Tests**: Pure functions and utilities
2. **Integration Tests**: API endpoints
3. **Coverage Goals**: 
   - Global: 70%+
   - Critical paths: 80%+

### Code Style
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Consistent error handling

## Environment Configuration

### Required Variables
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Admin operations

# External APIs
FINNHUB_API_KEY=your-finnhub-key

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Server
PORT=3000
NODE_ENV=development
```

### Environment-Specific Config
- **Development**: Local Supabase, verbose logging
- **Staging**: Test Supabase project, limited logging
- **Production**: Production Supabase, error logging only

## Common Development Tasks

### Adding a New Trading Strategy

1. **Define Strategy Type** (`src/types/strategies.ts`)
   ```typescript
   export interface NewStrategy {
     id: string;
     name: string;
     parameters: StrategyParams;
   }
   ```

2. **Implement Logic** (`src/controllers/strategies/newStrategy.js`)
   ```javascript
   export const calculateNewStrategy = async (symbol, params) => {
     // Implementation
   };
   ```

3. **Add Route** (`src/routes/strategies.js`)
   ```javascript
   router.get('/new-strategy/:symbol', newStrategyHandler);
   ```

4. **Write Tests** (`tests/controllers/strategies/newStrategy.test.js`)

### Creating a New API Endpoint

1. **Define Route** (`src/routes/`)
2. **Add Validation** (`src/validators/`)
3. **Implement Controller** (`src/controllers/`)
4. **Add Middleware** (if needed)
5. **Document in Swagger**
6. **Write Tests**

### Database Migrations

1. **Create Migration** (`supabase/migrations/`)
   ```sql
   -- YYYYMMDD_description.sql
   ALTER TABLE ...
   ```

2. **Update Schema** (`src/models/schema.sql`)

3. **Apply via Supabase Dashboard**

4. **Update Types** (`src/types/`)

### Deploying Edge Functions

```bash
# Deploy single function
npm run deploy:edge-function market-data

# Deploy all functions
npm run deploy:edge-functions

# Test edge function
curl https://your-project.supabase.co/functions/v1/market-data
```

## Performance Optimization

### Caching Strategy
- **Node-cache**: In-memory caching
- **Cache Keys**: `market:${symbol}:${interval}`
- **TTL**: 60 seconds for quotes, 5 minutes for candles

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling enabled
- Prepared statements for repeated queries

### API Performance
- Gzip compression enabled
- Rate limiting per user/IP
- Pagination for list endpoints

## Security Best Practices

### Authentication
- JWT tokens with 1-hour expiry
- Refresh tokens for extended sessions
- Secure cookie options in production

### Input Validation
- All inputs validated with Joi
- SQL injection prevention via parameterized queries
- XSS protection with input sanitization

### API Security
- CORS configured for allowed origins
- Helmet.js for security headers
- Rate limiting to prevent abuse

## Monitoring and Debugging

### Logging
```javascript
// Use structured logging
logger.info('User login', { 
  userId: user.id, 
  timestamp: new Date() 
});
```

### Health Checks
- `/health` - Basic health check
- `/health/detailed` - Database and service status

### Error Tracking
- All errors logged with stack traces
- User-facing errors sanitized
- Critical errors trigger alerts

## Deployment

### Docker
```bash
# Build image
docker build -t trader-api .

# Run container
docker run -p 3000:3000 --env-file .env trader-api
```

### Production Checklist
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] SSL certificates configured
- [ ] Monitoring enabled
- [ ] Backups configured

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   ```bash
   npm run typecheck -- --noEmit false
   ```

2. **Test Failures**
   ```bash
   npm run test:verbose -- --runInBand
   ```

3. **Supabase Connection**
   - Check credentials
   - Verify network access
   - Check RLS policies

### Debug Mode
```bash
DEBUG=* npm run dev
```

## Contributing Guidelines

1. **Code Standards**
   - Follow existing patterns
   - Add tests for new features
   - Update documentation

2. **Commit Messages**
   - Use conventional commits
   - Reference issues/PRs

3. **Pull Requests**
   - Run all tests
   - Update CHANGELOG
   - Request review

## Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Internal Docs
- `docs/ARCHITECTURE.md` - System design details
- `docs/DEVELOPER_GUIDE.md` - Development setup
- `docs/openapi.yaml` - API specification

### Support
- GitHub Issues for bug reports
- Discussions for questions
- Wiki for additional guides
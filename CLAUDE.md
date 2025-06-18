# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered stock recommendation backend API that implements legendary traders' strategies:
- **Jesse Livermore**: Trend following strategy
- **Larry Williams**: Short-term momentum strategy  
- **Stan Weinstein**: Stage analysis strategy

Built with Node.js, Express, TypeScript (partial migration), and Supabase as the database.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with nodemon
npm run dev:js       # JavaScript-only development mode
npm run build        # Compile TypeScript to JavaScript
npm run build:clean  # Clean build (removes dist/)
npm run watch        # Watch mode for TypeScript compilation
npm start            # Production mode (node dist/server.js)
```

### Testing
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests
npm run test:controllers   # Test controllers specifically
npm run test:services      # Test services specifically
npm run test:middleware    # Test middleware specifically
npm run test:security      # Security-focused tests
npm run test:silent        # Run with JEST_SILENT=false
npm run test:verbose       # Detailed output with no cache
```

### Code Quality
```bash
npm run lint         # Run ESLint on .ts,.tsx,.js,.jsx files
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking (tsc --noEmit)
```

**Important**: Always run `npm run typecheck` before committing TypeScript changes.

### Documentation
```bash
npm run docs:generate  # Generate documentation
npm run docs:serve     # Serve documentation locally (Jekyll)
npm run docs:build     # Build documentation (Jekyll)
```

## Architecture Overview

### Directory Structure
```
trader-api/
├── src/                      # Source code
│   ├── config/              # Configuration modules
│   │   ├── database.js      # Database connection config
│   │   ├── environment.js   # Environment variable management
│   │   ├── supabase.js/ts   # Supabase client (mixed JS/TS)
│   │   └── swagger.js       # Swagger API documentation config
│   ├── controllers/         # Request handlers (mixed JS/TS)
│   │   ├── authController.js/ts
│   │   ├── marketController.js
│   │   ├── portfolioController.js
│   │   ├── recommendationController.js
│   │   ├── strategyController.js
│   │   └── subscriptionController.js
│   ├── middleware/          # Express middleware (mixed JS/TS)
│   │   ├── auth.js/ts       # JWT authentication
│   │   ├── errorHandler.js  # Global error handling
│   │   ├── rateLimiter.js/ts # API rate limiting
│   │   └── security.js      # Security headers (Helmet)
│   ├── models/              # Database schemas
│   │   ├── schema.sql       # Main database schema
│   │   └── seed.sql         # Seed data for development
│   ├── routes/              # API route definitions (mixed JS/TS)
│   │   ├── auth.js/ts       # /api/auth/*
│   │   ├── health.js        # /health endpoint
│   │   ├── market.ts        # /api/market/*
│   │   ├── portfolio.ts     # /api/portfolio/*
│   │   ├── recommendations.ts # /api/recommendations/*
│   │   ├── strategies.ts    # /api/strategies/*
│   │   └── subscription.js  # /api/subscription/*
│   ├── services/            # External service integrations
│   │   └── finnhubService.js # Finnhub API for market data
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts         # Main type exports
│   │   ├── services.ts      # Service interfaces
│   │   ├── environment.d.ts # Environment variable types
│   │   ├── express.d.ts     # Express augmentations
│   │   └── logger.d.ts      # Logger types
│   ├── utils/               # Utility functions
│   │   ├── logger.ts        # Winston logger setup
│   │   ├── metrics.js       # Performance metrics
│   │   └── secrets.js       # Secret management
│   ├── validators/          # Input validation (all JS)
│   │   ├── auth.js
│   │   ├── market.js
│   │   ├── portfolio.js
│   │   ├── recommendation.js
│   │   ├── strategy.js
│   │   └── subscription.js
│   ├── server.js            # JavaScript entry point
│   └── server.ts            # TypeScript entry point
├── supabase/                # Supabase configuration
│   ├── config.toml          # Supabase project config
│   ├── functions/           # Edge Functions
│   │   ├── market-data/     # Real-time market data
│   │   ├── market-data-simple/ # Simplified market endpoint
│   │   ├── portfolio-management/ # Portfolio operations
│   │   ├── trading-signals/ # Strategy-based signals
│   │   ├── tradingview-webhook/ # TradingView integration
│   │   └── tradingview-webhook-secure/ # Secure webhook
│   └── migrations/          # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 20240607000000_initial_serverless_schema.sql
│       ├── 20240607000001_advanced_rls_policies.sql
│       └── 20250117_tradingview_webhooks.sql
├── tests/                   # Test files
├── docs/                    # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── PRD.md
│   ├── TRADINGVIEW_WEBHOOK_GUIDE.md
│   └── USER_MANUAL.md
└── flutter_integration/     # Flutter app integration guides
```

### Key Design Patterns
1. **MVC Architecture**: Clear separation between Models, Views (routes), and Controllers
2. **Middleware Chain**: Security → Authentication → Validation → Rate Limiting → Controller
3. **Service Layer**: External API calls abstracted in services
4. **Type Safety**: Progressive TypeScript migration (mixed JS/TS files)
5. **Error Handling**: Centralized error middleware with consistent response format

### API Authentication
- JWT-based authentication with refresh tokens
- Supabase Auth integration
- All protected routes require valid JWT in Authorization header
- Token expiry: 1 hour (access), 7 days (refresh)

### Database Strategy
- **Primary Database**: Supabase PostgreSQL
- **Edge Functions**: Serverless compute for:
  - `market-data`: Real-time stock quotes and candles
  - `portfolio-management`: Portfolio CRUD operations
  - `trading-signals`: Strategy-based buy/sell signals
  - `tradingview-webhook`: Webhook receiver for TradingView alerts
- **Migrations**: Timestamped SQL files in `supabase/migrations/`
- **RLS (Row Level Security)**: Enabled for all user tables

### External Integrations
- **Finnhub API**: Real-time market data and financial metrics
- **Technical Analysis**: Built-in indicators (moving averages, RSI, etc.)
- **WebSocket Support**: For real-time price updates
- **TradingView**: Webhook integration for custom alerts

### Subscription Tiers
1. **Basic (Free)**: 1 recommendation/week, basic indicators
2. **Premium ($29/month)**: 5 recommendations/week, advanced indicators
3. **Professional ($99/month)**: Unlimited recommendations, all features, priority support

### Performance Requirements
- API response time: < 200ms for most endpoints
- Real-time data: < 500ms latency
- Batch operations: Optimized for portfolios up to 100 positions
- Cache TTL: 60s for quotes, 5m for historical data

### Testing Strategy
- **Unit Tests**: Services, utilities, pure functions
- **Integration Tests**: API endpoints with database
- **Security Tests**: Authentication flows, input validation
- **Coverage Goals**: 70% overall, 80% for critical paths
- **Test Database**: Separate Supabase project for testing

## Development Workflow

### TypeScript Migration Status
- **Completed**: Core types, logger, auth middleware, rate limiter
- **In Progress**: Controllers (auth completed), config files
- **Remaining**: Services, validators, remaining controllers
- **Note**: Always check for both .js and .ts versions of files

### Pre-commit Checklist
1. Run `npm run typecheck` for TypeScript validation
2. Run `npm test` to ensure all tests pass
3. Run `npm run lint:fix` to fix code style issues
4. Update tests for any functional changes
5. Update API documentation if endpoints changed

### Git Workflow
```bash
# Feature branch
git checkout -b feature/your-feature

# After changes
npm run typecheck
npm run test
npm run lint:fix

# Commit with conventional format
git commit -m "feat: add new trading strategy"
# Types: feat, fix, docs, style, refactor, test, chore

# Push and create PR
git push origin feature/your-feature
```

## Environment Variables

Required environment variables (see .env.example):
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations

# External APIs
FINNHUB_API_KEY=your-finnhub-api-key

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-encryption-key  # Optional

# Server Configuration
PORT=3000
NODE_ENV=development  # development, production, test

# Rate Limiting
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window

# Optional
LOG_LEVEL=info        # debug, info, warn, error
CORS_ORIGIN=http://localhost:3001  # Frontend URL
```

## Common Tasks

### Adding a New Trading Strategy
1. Define strategy logic in `src/controllers/strategyController.js`
2. Add strategy types in `src/types/index.ts`:
   ```typescript
   export interface NewStrategy {
     name: string;
     parameters: {
       period: number;
       threshold: number;
     };
   }
   ```
3. Update recommendation engine in `src/controllers/recommendationController.js`
4. Create validator in `src/validators/strategy.js`
5. Add Edge Function if needed in `supabase/functions/trading-signals/`
6. Write tests in `tests/unit/strategies/`
7. Update Swagger documentation

### Modifying API Endpoints
1. Check for existing route in `src/routes/` (both .js and .ts)
2. Update/create controller in `src/controllers/`
3. Add validation in `src/validators/` (currently all .js)
4. Update Swagger annotations in controller:
   ```javascript
   /**
    * @swagger
    * /api/endpoint:
    *   get:
    *     summary: Description
    *     tags: [Category]
    *     security:
    *       - bearerAuth: []
    */
   ```
5. Write integration tests
6. Test locally: `npm run dev` and check `/api-docs`

### Database Migrations
1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add migration SQL:
   ```sql
   -- Add new column
   ALTER TABLE recommendations 
   ADD COLUMN confidence_score DECIMAL(3,2);
   
   -- Create index
   CREATE INDEX idx_recommendations_confidence 
   ON recommendations(confidence_score);
   ```
3. Update schema documentation in `src/models/schema.sql`
4. Apply migration:
   ```bash
   supabase db push
   # or via Supabase dashboard
   ```
5. Update TypeScript types in `src/types/`
6. Test with seed data

### Deploying Edge Functions
```bash
# Deploy single function
supabase functions deploy market-data

# Deploy with secrets
supabase secrets set FINNHUB_API_KEY=your-key
supabase functions deploy trading-signals

# Test locally
supabase functions serve market-data --env-file .env.local

# Invoke deployed function
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://your-project.supabase.co/functions/v1/market-data
```

### Performance Optimization
1. **Caching**: Node-cache with TTL
   ```javascript
   cache.set(`market:${symbol}`, data, 60); // 60 seconds
   ```
2. **Database**: Add indexes for frequently queried columns
3. **API**: Enable compression, implement pagination
4. **Monitoring**: Check `/metrics` endpoint

### Security Checklist
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (sanitize user input)
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Secrets in environment variables
- [ ] HTTPS only in production

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   ```bash
   # Check specific file
   npx tsc --noEmit src/path/to/file.ts
   
   # See all errors
   npm run typecheck
   ```

2. **Supabase Connection Issues**
   - Verify credentials in .env
   - Check Supabase dashboard for service status
   - Ensure RLS policies allow access
   - Check Edge Function logs

3. **Test Failures**
   ```bash
   # Run specific test
   npm test -- path/to/test.js
   
   # Debug mode
   npm run test:verbose
   ```

4. **Rate Limiting Issues**
   - Check `RATE_LIMIT_*` env vars
   - Clear Redis cache if using
   - Verify IP forwarding in production

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Specific module
DEBUG=express:* npm run dev
```

## Resources

### External Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Finnhub API Docs](https://finnhub.io/docs/api)

### Internal Documentation
- `/docs/ARCHITECTURE.md` - System design and decisions
- `/docs/DEVELOPER_GUIDE.md` - Detailed development setup
- `/docs/TRADINGVIEW_WEBHOOK_GUIDE.md` - TradingView integration
- `/docs/USER_MANUAL.md` - End-user documentation
- `/flutter_integration/` - Mobile app integration guides

### Important Notes
- Always check for both .js and .ts versions of files during migration
- Run tests before committing changes
- Update documentation when adding features
- Follow existing code patterns and conventions
- Never commit sensitive data or API keys
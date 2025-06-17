# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered stock recommendation backend API that implements legendary traders' strategies:
- **Jesse Livermore**: Trend following strategy
- **Larry Williams**: Short-term momentum strategy  
- **Stan Weinstein**: Stage analysis strategy

Built with Node.js, Express, TypeScript, and Supabase as the database.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript to JavaScript
npm run watch        # Watch mode for TypeScript compilation
```

### Testing
```bash
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage report
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests
npm run test:controllers   # Test controllers specifically
npm run test:services      # Test services specifically
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
```

### Documentation
```bash
npm run docs:generate  # Generate documentation
npm run docs:serve     # Serve documentation locally
npm run docs:build     # Build documentation
```

## Architecture Overview

### Directory Structure
- **src/config/**: Database, environment, Supabase, and Swagger configurations
- **src/controllers/**: Request handlers for auth, market, portfolio, recommendations, strategies, and subscriptions
- **src/middleware/**: Authentication, error handling, rate limiting, and security middleware
- **src/models/**: Database schemas and seed data
- **src/routes/**: API route definitions
- **src/services/**: External service integrations (Finnhub API)
- **src/types/**: TypeScript type definitions
- **src/utils/**: Logger, metrics, and secrets management utilities
- **src/validators/**: Input validation logic

### Key Design Patterns
1. **MVC Architecture**: Clear separation between Models, Views (routes), and Controllers
2. **Middleware Chain**: Authentication → Validation → Rate Limiting → Controller
3. **Service Layer**: External API calls abstracted in services
4. **Type Safety**: Comprehensive TypeScript types for all entities

### API Authentication
- JWT-based authentication with refresh tokens
- Token stored in Supabase auth system
- All protected routes require valid JWT in Authorization header

### Database Strategy
- Supabase as primary database
- Edge Functions for serverless operations
- Real-time subscriptions for market data updates

### External Integrations
- **Finnhub API**: Real-time market data and financial metrics
- **Technical Analysis (ta-lib)**: For calculating technical indicators
- **WebSocket**: Real-time price updates

### Subscription Tiers
1. **Basic (Free)**: 1 recommendation/week, basic indicators
2. **Premium ($29/month)**: 5 recommendations/week, advanced indicators
3. **Professional ($99/month)**: Unlimited recommendations, all features

### Performance Requirements
- API response time: < 200ms for most endpoints
- Real-time data: < 500ms latency
- Batch operations optimized for large portfolios

### Testing Strategy
- Unit tests for all services and utilities
- Integration tests for API endpoints
- Security tests for authentication flows
- Performance tests for critical paths

## Development Workflow

1. Always run `npm run typecheck` before committing
2. Ensure tests pass with `npm test`
3. Use `npm run lint:fix` to maintain code style
4. Update tests when modifying functionality
5. Document API changes in Swagger annotations

## Environment Variables

Required environment variables (see .env.example):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `FINNHUB_API_KEY`: Finnhub API key for market data
- `JWT_SECRET`: Secret for JWT signing
- `PORT`: Server port (default: 3000)

## Common Tasks

### Adding a New Strategy
1. Create strategy logic in `src/controllers/strategies/`
2. Add strategy types in `src/types/`
3. Update recommendation engine in `src/controllers/recommendations/`
4. Add tests in `tests/unit/strategies/`

### Modifying API Endpoints
1. Update route in `src/routes/`
2. Implement/modify controller in `src/controllers/`
3. Add validation in `src/validators/`
4. Update Swagger documentation
5. Write integration tests

### Database Migrations
1. Create migration file in `src/models/migrations/`
2. Update schema in `src/models/schema.sql`
3. Run migration through Supabase dashboard
4. Update TypeScript types accordingly
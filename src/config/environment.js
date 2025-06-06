import dotenv from 'dotenv';
import path from 'path';

// 환경에 따라 적절한 .env 파일 로드
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;

// 환경별 .env 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// 기본 .env 파일도 로드 (fallback)
dotenv.config();

const config = {
  // 환경 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  
  // 데이터베이스 설정
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // 외부 API 설정
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY,
    baseUrl: process.env.FINNHUB_BASE_URL || 'https://finnhub.io/api/v1',
  },
  
  // CORS 설정
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  
  // Rate Limiting 설정
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15분
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // Redis 설정
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    errorFile: process.env.LOG_FILE_ERROR || 'logs/error.log',
    combinedFile: process.env.LOG_FILE_COMBINED || 'logs/combined.log',
  },
  
  // 이메일 설정
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
  
  // 모니터링 설정
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
  },
  
  // 기능 플래그
  features: {
    websocket: process.env.ENABLE_WEBSOCKET === 'true',
    cache: process.env.ENABLE_CACHE === 'true',
    rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  },
  
  // 보안 설정
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET,
  },
  
  // 헬스체크
  healthCheck: {
    path: process.env.HEALTH_CHECK_PATH || '/health',
  },
};

// 필수 환경 변수 검증
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'FINNHUB_API_KEY',
];

if (nodeEnv === 'production') {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missingVars.join(', ')}`);
  }
}

// 환경별 설정 검증
if (nodeEnv === 'production') {
  if (config.jwt.secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters in production');
  }
  if (config.security.bcryptRounds < 10) {
    throw new Error('Bcrypt rounds should be at least 10 in production');
  }
}

export default config;
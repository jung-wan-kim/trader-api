const rateLimit = require('express-rate-limit');

// TypeScript 타입 임포트
import type { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Rate Limiting 설정
 * @description API 남용 방지를 위한 요청 제한 설정
 */


// 기본 rate limiter (일반 API 엔드포인트용)
const defaultRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 기본 1분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 분당 100 요청
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 엄격한 rate limiter (민감한 엔드포인트용)
const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 분당 5 요청
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 인증 rate limiter (로그인, 회원가입용)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 분당 10 요청
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
});

// API 키 rate limiter (구독 티어별 차등 적용)
const createApiKeyRateLimiter = (tier: 'basic' | 'premium' | 'professional'): RateLimitRequestHandler => {
  const limits = {
    basic: { windowMs: 60000, max: 60 }, // 분당 60 요청
    premium: { windowMs: 60000, max: 300 }, // 분당 300 요청
    professional: { windowMs: 60000, max: 1000 }, // 분당 1000 요청
  };

  const { windowMs, max } = limits[tier];

  return rateLimit({
    windowMs,
    max,
    message: `Rate limit exceeded for ${tier} tier. Please upgrade your subscription for higher limits.`,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // API 키를 기준으로 rate limiting
      return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
    },
  });
};

// WebSocket rate limiter
const websocketRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 100 메시지
  message: 'Too many WebSocket messages, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 파일 업로드 rate limiter
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10, // 시간당 10개 파일
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 검색 rate limiter
const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 분당 30 검색
  message: 'Too many search requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 동적 rate limiter (사용자별 커스텀 제한)
const createDynamicRateLimiter = (
  getLimit: (req: any) => { windowMs: number; max: number }
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: 60000, // 기본값
    max: 100, // 기본값
    message: 'Rate limit exceeded.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
    skip: (req) => {
      const limit = getLimit(req);
      // 동적으로 제한 설정
      (req as any).rateLimit = limit;
      return false;
    },
  });
};

// Rate limiter 그룹
const rateLimiter = {
  default: defaultRateLimiter,
  standard: defaultRateLimiter, // alias
  strict: strictRateLimiter,
  auth: authRateLimiter,
  websocket: websocketRateLimiter,
  upload: uploadRateLimiter,
  search: searchRateLimiter,
  createApiKeyRateLimiter,
  createDynamicRateLimiter,
};

// CommonJS exports
exports.rateLimiter = rateLimiter;

// 기본 export (하위 호환성)
module.exports = rateLimiter.default;
module.exports.rateLimiter = rateLimiter;
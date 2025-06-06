import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config/environment.js';

// Helmet 보안 헤더 설정
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.finnhub.io"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// API Rate Limiting
export const apiRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 헬스체크는 rate limiting에서 제외
    return req.path === config.healthCheck.path;
  },
});

// 인증 관련 엄격한 Rate Limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분간 5번의 시도만 허용
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: 900, // 15분
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// IP 화이트리스트 미들웨어 (관리자용)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (config.NODE_ENV === 'development') {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }

    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied from this IP address',
    });
  };
};

// Request ID 미들웨어 (로깅 및 트레이싱용)
export const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

// API 키 검증 미들웨어
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API Key',
      message: 'API key is required in X-API-Key header',
    });
  }

  // TODO: 실제 API 키 검증 로직 구현
  // 예: 데이터베이스에서 API 키 조회 및 검증
  
  next();
};

// HTTPS 리다이렉트 미들웨어
export const httpsRedirect = (req, res, next) => {
  if (config.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
};

// 민감한 헤더 제거
export const removeSensitiveHeaders = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
};
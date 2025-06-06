const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// TypeScript 타입 임포트
import type { Request, Response, NextFunction } from 'express';

/**
 * 인증 미들웨어
 * @description JWT 토큰을 검증하고 사용자 정보를 요청 객체에 추가
 */

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscription_tier: 'basic' | 'premium' | 'professional';
        subscription_status: 'active' | 'cancelled' | 'expired';
        subscription_end_date?: string;
      };
      token?: string;
    }
  }
}

// JWT 페이로드 타입
interface JWTPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}


/**
 * JWT 토큰 검증
 */
function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * 토큰 추출 헬퍼
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * 인증 미들웨어
 */
const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. 토큰 추출
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
      return;
    }
    
    // 2. 토큰 검증
    const payload = verifyToken(token);
    
    // 3. 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, subscription_tier, subscription_status, subscription_end_date')
      .eq('id', payload.sub)
      .single();
    
    if (error || !user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
      return;
    }
    
    // 4. 구독 상태 확인
    if (user.subscription_status !== 'active') {
      res.status(403).json({
        error: 'Subscription inactive',
        message: 'Your subscription has expired or been cancelled'
      });
      return;
    }
    
    // 5. 구독 만료일 확인
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      if (endDate < new Date()) {
        // 구독 상태 업데이트
        await supabase
          .from('users')
          .update({ subscription_status: 'expired' })
          .eq('id', user.id);
        
        res.status(403).json({
          error: 'Subscription expired',
          message: 'Your subscription has expired'
        });
        return;
      }
    }
    
    // 6. 요청 객체에 사용자 정보 추가
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof Error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

/**
 * 선택적 인증 미들웨어
 * @description 인증이 선택적인 엔드포인트에서 사용
 */
const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }
    
    const payload = verifyToken(token);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, subscription_tier, subscription_status, subscription_end_date')
      .eq('id', payload.sub)
      .single();
    
    if (!error && user && user.subscription_status === 'active') {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // 토큰이 유효하지 않아도 계속 진행
    next();
  }
};

/**
 * 구독 티어 확인 미들웨어
 */
const requireSubscription = (
  requiredTiers: Array<'basic' | 'premium' | 'professional'>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    if (!requiredTiers.includes(req.user.subscription_tier)) {
      res.status(403).json({
        error: 'Insufficient subscription tier',
        message: `This feature requires one of the following subscription tiers: ${requiredTiers.join(', ')}`
      });
      return;
    }
    
    next();
  };
};

/**
 * API 키 인증 미들웨어
 * @description API 키를 사용한 인증 (외부 서비스 연동용)
 */
const authenticateAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Please provide an API key in the x-api-key header'
      });
      return;
    }
    
    // API 키로 사용자 조회
    const { data: apiKeyRecord, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        user_id,
        name,
        last_used_at,
        users (
          id,
          email,
          subscription_tier,
          subscription_status,
          subscription_end_date
        )
      `)
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
    
    if (error || !apiKeyRecord || !apiKeyRecord.users) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or inactive'
      });
      return;
    }
    
    // 사용자 정보를 단일 객체로 변환
    const user = Array.isArray(apiKeyRecord.users) 
      ? apiKeyRecord.users[0] 
      : apiKeyRecord.users;
    
    // 구독 상태 확인
    if (user.subscription_status !== 'active') {
      res.status(403).json({
        error: 'Subscription inactive',
        message: 'The associated subscription is not active'
      });
      return;
    }
    
    // API 키 사용 시간 업데이트
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);
    
    // 요청 객체에 사용자 정보 추가
    req.user = user;
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during API key authentication'
    });
  }
};

/**
 * 토큰 갱신 함수
 */
async function refreshToken(oldToken: string): Promise<string> {
  try {
    const payload = verifyToken(oldToken);
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const newToken = jwt.sign(
      {
        sub: payload.sub,
        email: payload.email
      },
      secret,
      {
        expiresIn: '7d'
      }
    );
    
    return newToken;
  } catch (error) {
    throw new Error('Failed to refresh token');
  }
}

// CommonJS exports
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.requireSubscription = requireSubscription;
exports.authenticateAPIKey = authenticateAPIKey;
exports.refreshToken = refreshToken;

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.optionalAuthenticate = optionalAuthenticate;
module.exports.requireSubscription = requireSubscription;
module.exports.authenticateAPIKey = authenticateAPIKey;
module.exports.refreshToken = refreshToken;
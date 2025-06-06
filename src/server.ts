import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// 환경 변수 로드
dotenv.config();

// 미들웨어 임포트
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// 라우터 임포트
import authRoutes from './routes/auth';
import marketRoutes from './routes/market';
import portfolioRoutes from './routes/portfolio';
import recommendationRoutes from './routes/recommendations';
import strategyRoutes from './routes/strategies';

// 유틸리티 임포트
import logger from './utils/logger';

// Supabase 클라이언트 임포트
import { supabase } from './config/supabase';

/**
 * Express 애플리케이션 설정
 */
const app: Application = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 미들웨어 설정
 */

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.finnhub.io", "https://*.supabase.co"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS 설정
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // 개발 환경에서는 모든 origin 허용
    if (NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // origin이 없는 경우 (같은 origin 요청)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // 허용된 origin 확인
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24시간
};

app.use(cors(corsOptions));

// 요청 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 압축
app.use(compression());

// 로깅
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// 신뢰할 수 있는 프록시 설정
app.set('trust proxy', 1);

/**
 * 상태 확인 엔드포인트
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // 데이터베이스 연결 확인
    const { error } = await supabase.from('users').select('count').limit(1);
    
    const dbStatus = error ? 'unhealthy' : 'healthy';
    const status = dbStatus === 'healthy' ? 'healthy' : 'degraded';
    
    res.status(status === 'healthy' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      service: 'trader-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      checks: {
        database: dbStatus,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * API 라우트
 */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/market', rateLimiter.standard, marketRoutes);
app.use('/api/v1/portfolio', rateLimiter.standard, portfolioRoutes);
app.use('/api/v1/recommendations', rateLimiter.standard, recommendationRoutes);
app.use('/api/v1/strategies', rateLimiter.standard, strategyRoutes);

/**
 * API 문서 (개발 환경에서만)
 */
if (NODE_ENV === 'development') {
  app.get('/api/docs', (_req: Request, res: Response) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'Trader API',
        version: '1.0.0',
        description: 'AI-powered stock trading recommendations based on legendary traders strategies'
      },
      servers: [
        {
          url: `http://localhost:${PORT}/api/v1`,
          description: 'Development server'
        }
      ],
      paths: {
        '/auth/register': {
          post: {
            summary: 'Register a new user',
            tags: ['Authentication'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string', minLength: 8 },
                      name: { type: 'string', minLength: 2, maxLength: 50 }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  });
}

/**
 * 404 핸들러
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * 전역 에러 핸들러
 */
app.use(errorHandler);

/**
 * HTTP 서버 생성
 */
const server = createServer(app);

/**
 * WebSocket 서버 설정 (실시간 기능용)
 */
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  verifyClient: (info, callback) => {
    // WebSocket 연결 인증 로직
    const token = info.req.headers.authorization?.split(' ')[1];
    if (!token) {
      callback(false, 401, 'Unauthorized');
      return;
    }
    
    // 토큰 검증 (간단한 예시)
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      (info.req as any).userId = decoded.sub;
      callback(true);
    } catch (error) {
      callback(false, 401, 'Invalid token');
    }
  }
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  const userId = (req as any).userId;
  logger.info(`WebSocket connection established for user: ${userId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // 메시지 타입에 따른 처리
      switch (data.type) {
        case 'subscribe':
          // 실시간 가격 구독
          logger.info(`User ${userId} subscribed to: ${data.symbols}`);
          break;
          
        case 'unsubscribe':
          // 구독 해제
          logger.info(`User ${userId} unsubscribed from: ${data.symbols}`);
          break;
          
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    logger.info(`WebSocket connection closed for user: ${userId}`);
  });
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error for user ${userId}:`, error);
  });
  
  // 초기 메시지 전송
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established'
  }));
});

/**
 * 프로세스 에러 핸들링
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

/**
 * 서버 시작
 */
const startServer = async () => {
  try {
    // 데이터베이스 연결 확인
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    server.listen(PORT, () => {
      logger.info(`
        🚀 Trader API Server is running!
        📡 Environment: ${NODE_ENV}
        🔗 Local: http://localhost:${PORT}
        🔗 Health: http://localhost:${PORT}/health
        📚 API Docs: http://localhost:${PORT}/api/docs (dev only)
        🔌 WebSocket: ws://localhost:${PORT}/ws
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// TypeScript 직접 실행 또는 컴파일된 JS 실행 모두 지원
if (require.main === module) {
  startServer();
}

export { app, server };
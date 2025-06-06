import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 환경 변수 로드
dotenv.config();

// ES 모듈에서 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 라우터 임포트 (점진적 마이그레이션을 위해 .js 파일도 지원)
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import portfolioRoutes from './routes/portfolio.js';
import recommendationRoutes from './routes/recommendations.js';
import strategyRoutes from './routes/strategies.js';

// 미들웨어 임포트
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// 유틸리티 임포트
import logger from './utils/logger.js';

// Express 앱 생성
const app: Express = express();
const PORT = process.env.PORT || 3001;

// 기본 미들웨어
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use('/api/', rateLimiter);

// 헬스 체크 엔드포인트
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API 버전 확인
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    version: process.env.API_VERSION || '1.0.0',
    typescript: true,
  });
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/strategies', strategyRoutes);

// 404 핸들러
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// 에러 핸들링 미들웨어
app.use(errorHandler);

// 서버 시작
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`TypeScript migration enabled`);
  });
}

export default app;
import express from 'express';
import config from '../config/environment.js';
import metricsCollector from '../utils/metrics.js';
import secretsManager from '../utils/secrets.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase 클라이언트 (헬스체크용)
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * 기본 헬스체크 엔드포인트
 */
router.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
  };

  res.status(200).json(healthStatus);
});

/**
 * 상세 헬스체크 엔드포인트
 */
router.get('/health/detailed', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';

  try {
    // 데이터베이스 연결 체크
    checks.database = await checkDatabase();
    
    // 외부 API 연결 체크
    checks.externalApis = await checkExternalApis();
    
    // 시스템 리소스 체크
    checks.system = checkSystemResources();
    
    // 메트릭 정보
    checks.metrics = metricsCollector.getHealthMetrics();

    // 전체 상태 결정
    const hasUnhealthyService = Object.values(checks).some(check => 
      check.status && check.status !== 'healthy'
    );

    if (hasUnhealthyService) {
      overallStatus = 'degraded';
    }

  } catch (error) {
    overallStatus = 'unhealthy';
    checks.error = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  const healthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * 준비 상태 체크 (Kubernetes readiness probe용)
 */
router.get('/health/ready', async (req, res) => {
  try {
    // 필수 서비스들이 준비되었는지 확인
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status !== 'healthy') {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 생존 상태 체크 (Kubernetes liveness probe용)
 */
router.get('/health/live', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  
  // 메모리 사용량이 500MB를 초과하면 unhealthy
  if (heapUsedMB > 500) {
    return res.status(503).json({
      status: 'unhealthy',
      reason: 'High memory usage',
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * 메트릭 엔드포인트 (모니터링 시스템용)
 */
router.get('/metrics', (req, res) => {
  // 프로덕션에서는 인증 필요
  if (config.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.METRICS_API_KEY) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid API key required for metrics access',
      });
    }
  }

  const metrics = metricsCollector.getMetrics();
  
  // 민감한 정보 마스킹
  const sanitizedMetrics = {
    ...metrics,
    environment: secretsManager.sanitizeEnvironment(process.env),
  };

  res.status(200).json(sanitizedMetrics);
});

/**
 * 설정 정보 엔드포인트 (개발/스테이징 전용)
 */
router.get('/config', (req, res) => {
  if (config.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Config endpoint not available in production',
    });
  }

  const configInfo = {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    logLevel: config.logging.level,
    features: config.features,
    cors: config.cors,
    rateLimit: config.rateLimit,
  };

  res.status(200).json(configInfo);
});

/**
 * 데이터베이스 연결 체크
 */
async function checkDatabase() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (괜찮음)
      throw error;
    }

    return {
      status: 'healthy',
      responseTime: Date.now(),
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
      error: error.code,
    };
  }
}

/**
 * 외부 API 연결 체크
 */
async function checkExternalApis() {
  const checks = {};

  // Finnhub API 체크
  try {
    const response = await fetch(`${config.finnhub.baseUrl}/stock/profile2?symbol=AAPL&token=${config.finnhub.apiKey}`);
    
    if (response.ok) {
      checks.finnhub = {
        status: 'healthy',
        responseTime: Date.now(),
        statusCode: response.status,
      };
    } else {
      checks.finnhub = {
        status: 'degraded',
        statusCode: response.status,
        message: 'Finnhub API returned non-200 status',
      };
    }
  } catch (error) {
    checks.finnhub = {
      status: 'unhealthy',
      message: `Finnhub API check failed: ${error.message}`,
    };
  }

  return checks;
}

/**
 * 시스템 리소스 체크
 */
function checkSystemResources() {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

  let status = 'healthy';
  let message = 'System resources normal';

  if (heapUsedMB > 400) {
    status = 'degraded';
    message = 'High memory usage detected';
  }

  if (heapUsedMB > 500) {
    status = 'unhealthy';
    message = 'Critical memory usage';
  }

  return {
    status,
    message,
    memory: {
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      heapTotal: `${heapTotalMB.toFixed(2)}MB`,
      usage: `${((heapUsedMB / heapTotalMB) * 100).toFixed(2)}%`,
    },
    uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
  };
}

export default router;
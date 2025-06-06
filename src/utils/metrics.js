import logger from './logger.js';

/**
 * 애플리케이션 메트릭 수집 및 모니터링 유틸리티
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        responseTime: [],
      },
      database: {
        queries: 0,
        errors: 0,
        connectionPool: {
          active: 0,
          idle: 0,
        },
      },
      api: {
        finnhub: {
          calls: 0,
          errors: 0,
          rateLimitHits: 0,
        },
      },
      system: {
        memory: {
          used: 0,
          free: 0,
          heapUsed: 0,
        },
        cpu: {
          usage: 0,
        },
        uptime: 0,
      },
      errors: [],
      startTime: Date.now(),
    };

    // 주기적으로 시스템 메트릭 수집
    this.startSystemMetricsCollection();
  }

  /**
   * HTTP 요청 메트릭 기록
   */
  recordRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    this.metrics.requests.responseTime.push(responseTime);
    
    // 최근 1000개의 응답 시간만 유지
    if (this.metrics.requests.responseTime.length > 1000) {
      this.metrics.requests.responseTime = this.metrics.requests.responseTime.slice(-1000);
    }

    logger.debug('Request metric recorded', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });
  }

  /**
   * 데이터베이스 메트릭 기록
   */
  recordDatabaseQuery(query, duration, error = null) {
    this.metrics.database.queries++;
    
    if (error) {
      this.metrics.database.errors++;
      logger.error('Database query error', { query, duration, error: error.message });
    }

    logger.debug('Database metric recorded', {
      query: query.substring(0, 100),
      duration: `${duration}ms`,
      error: error ? error.message : null,
    });
  }

  /**
   * API 호출 메트릭 기록
   */
  recordApiCall(service, endpoint, success = true, isRateLimit = false) {
    if (service === 'finnhub') {
      this.metrics.api.finnhub.calls++;
      
      if (!success) {
        this.metrics.api.finnhub.errors++;
      }
      
      if (isRateLimit) {
        this.metrics.api.finnhub.rateLimitHits++;
      }
    }

    logger.debug('API call metric recorded', {
      service,
      endpoint,
      success,
      isRateLimit,
    });
  }

  /**
   * 에러 메트릭 기록
   */
  recordError(error, context = {}) {
    const errorMetric = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
    };

    this.metrics.errors.push(errorMetric);

    // 최근 100개의 에러만 유지
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }

    logger.error('Error metric recorded', errorMetric);
  }

  /**
   * 시스템 메트릭 수집 시작
   */
  startSystemMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // 30초마다 수집

    // 초기 수집
    this.collectSystemMetrics();
  }

  /**
   * 시스템 메트릭 수집
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.system.memory = {
      used: memUsage.rss,
      free: process.memoryUsage().external,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };

    this.metrics.system.uptime = process.uptime();

    logger.debug('System metrics collected', {
      memory: this.metrics.system.memory,
      uptime: this.metrics.system.uptime,
    });
  }

  /**
   * 응답 시간 통계 계산
   */
  getResponseTimeStats() {
    const times = this.metrics.requests.responseTime;
    
    if (times.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, min, max, p95, p99 };
  }

  /**
   * 에러율 계산
   */
  getErrorRate() {
    const total = this.metrics.requests.total;
    const errors = this.metrics.requests.error;
    
    return total > 0 ? (errors / total) * 100 : 0;
  }

  /**
   * 전체 메트릭 반환
   */
  getMetrics() {
    return {
      ...this.metrics,
      computed: {
        responseTimeStats: this.getResponseTimeStats(),
        errorRate: this.getErrorRate(),
        uptime: Date.now() - this.metrics.startTime,
      },
    };
  }

  /**
   * 메트릭 요약 반환 (헬스체크용)
   */
  getHealthMetrics() {
    const responseStats = this.getResponseTimeStats();
    const errorRate = this.getErrorRate();

    return {
      requests: {
        total: this.metrics.requests.total,
        errorRate: `${errorRate.toFixed(2)}%`,
        avgResponseTime: `${responseStats.avg.toFixed(2)}ms`,
      },
      database: {
        queries: this.metrics.database.queries,
        errors: this.metrics.database.errors,
      },
      system: {
        memory: {
          heapUsed: `${(this.metrics.system.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(this.metrics.system.memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        },
        uptime: `${(this.metrics.system.uptime / 60).toFixed(2)} minutes`,
      },
      recentErrors: this.metrics.errors.slice(-5).map(err => ({
        message: err.message,
        timestamp: err.timestamp,
      })),
    };
  }

  /**
   * 메트릭 리셋
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        responseTime: [],
      },
      database: {
        queries: 0,
        errors: 0,
        connectionPool: {
          active: 0,
          idle: 0,
        },
      },
      api: {
        finnhub: {
          calls: 0,
          errors: 0,
          rateLimitHits: 0,
        },
      },
      system: {
        memory: {
          used: 0,
          free: 0,
          heapUsed: 0,
        },
        cpu: {
          usage: 0,
        },
        uptime: 0,
      },
      errors: [],
      startTime: Date.now(),
    };

    logger.info('Metrics reset');
  }
}

// 싱글톤 인스턴스 생성
const metricsCollector = new MetricsCollector();

export default metricsCollector;
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/environment.js').default;

// CommonJS 환경에서는 __dirname이 자동으로 사용 가능

// 로그 디렉토리 설정
const logDir = path.join(__dirname, '../../logs');

// 로그 디렉토리가 없으면 생성
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 환경별 로그 레벨 설정
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

const getLogLevel = (): LogLevel => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'warn';
    case 'staging':
      return 'info';
    case 'test':
      return 'error';
    case 'development':
    default:
      return 'debug';
  }
};

// 커스텀 로그 포맷
const customFormat = winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// 로거 인스턴스 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'trader-api' },
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // 전체 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  exitOnError: false
});

// 테스트 환경이 아닌 경우 콘솔 출력 추가
if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      )
    })
  );
}

// Morgan과의 통합을 위한 스트림 인터페이스
interface LoggerStream {
  write: (message: string) => void;
}

const stream: LoggerStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  }
};

// 로거 확장 인터페이스
interface ExtendedLogger extends winston.Logger {
  stream: LoggerStream;
}

// 타입 확장
const extendedLogger = logger as ExtendedLogger;
extendedLogger.stream = stream;

// 유틸리티 함수들
const logError = (error: Error | unknown, context?: Record<string, any>): void => {
  if (error instanceof Error) {
    logger.error(error.message, { 
      stack: error.stack,
      name: error.name,
      ...context 
    });
  } else {
    logger.error('Unknown error', { error, ...context });
  }
};

const logRequest = (req: any, res: any, responseTime: number): void => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  
  logger.http('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userAgent: headers['user-agent']
  });
};

const logDatabaseQuery = (query: string, params?: any[], duration?: number): void => {
  logger.debug('Database Query', {
    query,
    params,
    duration: duration ? `${duration}ms` : undefined
  });
};

const logApiCall = (service: string, endpoint: string, response?: any, error?: Error): void => {
  if (error) {
    logger.error(`API Call Failed: ${service}`, {
      endpoint,
      error: error.message,
      stack: error.stack
    });
  } else {
    logger.info(`API Call Success: ${service}`, {
      endpoint,
      response: response ? JSON.stringify(response).substring(0, 200) : undefined
    });
  }
};

// 환경별 로거 설정 정보 출력
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  logLevel: logger.level,
  logDirectory: logDir
});

// CommonJS exports
exports.logError = logError;
exports.logRequest = logRequest;
exports.logDatabaseQuery = logDatabaseQuery;
exports.logApiCall = logApiCall;

module.exports = extendedLogger;
module.exports.logError = logError;
module.exports.logRequest = logRequest;
module.exports.logDatabaseQuery = logDatabaseQuery;
module.exports.logApiCall = logApiCall;
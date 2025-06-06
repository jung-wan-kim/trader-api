const winston = require('winston');
const logger = require('../../src/utils/logger');

describe('Logger Utility', () => {
  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.transports).toBeDefined();
  });

  it('should have all log methods', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have correct log level in test environment', () => {
    // 테스트 환경에서는 silent 레벨이어야 함
    expect(logger.level).toBe('silent');
  });

  it('should log without errors', () => {
    // 로그 메서드가 에러 없이 실행되는지 확인
    expect(() => logger.error('test error')).not.toThrow();
    expect(() => logger.warn('test warning')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.debug('test debug')).not.toThrow();
  });

  it('should handle log with metadata', () => {
    expect(() => logger.info('test message', { userId: 123 })).not.toThrow();
    expect(() => logger.error('error message', { error: new Error('test') })).not.toThrow();
  });

  it('should handle various log formats', () => {
    expect(() => logger.info({ message: 'object message' })).not.toThrow();
    expect(() => logger.error(new Error('direct error'))).not.toThrow();
    expect(() => logger.warn('message with %s', 'formatting')).not.toThrow();
  });
});
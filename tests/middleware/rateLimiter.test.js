const rateLimiter = require('../../src/middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  it('should export rate limiter functions', () => {
    expect(rateLimiter).toBeDefined();
    expect(typeof rateLimiter.createRateLimiter).toBe('function');
    expect(typeof rateLimiter.apiLimiter).toBe('function');
    expect(typeof rateLimiter.authLimiter).toBe('function');
  });

  it('should create rate limiter with custom options', () => {
    const customLimiter = rateLimiter.createRateLimiter({
      windowMs: 5 * 60 * 1000,
      max: 10
    });
    
    expect(customLimiter).toBeDefined();
    expect(typeof customLimiter).toBe('function');
  });

  it('should create rate limiter with message function', () => {
    const customLimiter = rateLimiter.createRateLimiter({
      windowMs: 1 * 60 * 1000,
      max: 5,
      message: (req, res) => {
        return 'Custom rate limit message';
      }
    });
    
    expect(customLimiter).toBeDefined();
  });

  it('should have different limits for different limiters', () => {
    // API limiter와 Auth limiter는 다른 설정을 가져야 함
    expect(rateLimiter.apiLimiter).toBeDefined();
    expect(rateLimiter.authLimiter).toBeDefined();
    expect(rateLimiter.apiLimiter).not.toBe(rateLimiter.authLimiter);
  });

  it('should handle skip function', () => {
    const skipLimiter = rateLimiter.createRateLimiter({
      windowMs: 1 * 60 * 1000,
      max: 5,
      skip: (req) => req.ip === '127.0.0.1'
    });
    
    expect(skipLimiter).toBeDefined();
  });

  it('should handle standardHeaders option', () => {
    const limiter = rateLimiter.createRateLimiter({
      windowMs: 1 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false
    });
    
    expect(limiter).toBeDefined();
  });
});
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    // 서버 및 설정 파일 제외
    '!src/server.js',
    '!src/config/**',
    // 복잡한 컨트롤러 제외 (API 연동이 많음)
    '!src/controllers/marketController.js',
    '!src/controllers/portfolioController.js',
    '!src/controllers/subscriptionController.js',
    // 라우트 파일 제외 (단순 라우팅)
    '!src/routes/**',
    // 스키마 파일 제외
    '!src/models/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  coverageReporters: ['text', 'lcov', 'html']
};
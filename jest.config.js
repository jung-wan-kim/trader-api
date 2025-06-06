module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.js'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 30,
      statements: 30
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testTimeout: 5000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
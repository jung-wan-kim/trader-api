module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // ES 모듈 지원
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }]
      ]
    }]
  },
  
  // 실용적인 커버리지 설정 - 핵심 비즈니스 로직 중심
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/models/**',
    '!src/routes/**', // 라우팅 로직은 통합 테스트에서 검증
    '!src/utils/logger.js', // 로깅 유틸리티 제외
  ],
  
  // 현실적인 커버리지 목표 설정 (70% 목표)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75
    },
    // 핵심 컨트롤러는 더 높은 목표
    'src/controllers/authController.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/controllers/portfolioController.js': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.integration.test.js'
  ],
  
  testTimeout: 15000, // API 호출을 고려한 시간 연장
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  coverageReporters: ['text', 'lcov', 'html', 'text-summary'],
  
  // 테스트 실행 순서 - 빠른 단위 테스트 먼저
  testSequencer: '<rootDir>/tests/testSequencer.js',
  
  // 병렬 실행 설정
  maxWorkers: 4,
  
  // 에러 발생시 계속 실행
  bail: false,
  
  // 테스트 결과 수집
  collectCoverage: false, // 기본값으로 커버리지 비활성화, npm script에서 활성화
};
// Jest 테스트 환경 설정
import dotenv from 'dotenv';

// 테스트 환경 변수 로드
dotenv.config({ path: '.env.test' });

// 테스트 타임아웃 설정
jest.setTimeout(30000);

// 전역 모의 함수
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
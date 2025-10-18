module.exports = {
  displayName: 'E2E Tests',
  testMatch: ['<rootDir>/src/test/e2e/**/*.e2e.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000, // 60 seconds for e2e tests
  maxWorkers: 1, // Run e2e tests sequentially to avoid conflicts
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
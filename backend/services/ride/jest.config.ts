import type { Config } from 'jest';

const config: Config = {
  preset:              'ts-jest',
  testEnvironment:     'node',
  roots:               ['<rootDir>/src'],
  testMatch:           ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ebike/core$':   '<rootDir>/../../shared/core/index.ts',
    '^@ebike/types$':  '<rootDir>/../../shared/types/index.ts',
    '^@ebike/redis$':  '<rootDir>/../../shared/redis/client.ts',
    '^@ebike/events$': '<rootDir>/../../shared/events/producer.ts',
    '^@ebike/mqtt$':   '<rootDir>/../../shared/mqtt/client.ts',
    '^@ebike/db$':     '<rootDir>/../../shared/db/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/index.ts'],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },
  clearMocks:   true,
  resetModules: true,
};

export default config;

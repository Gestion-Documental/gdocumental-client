module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^node-fetch$': 'jest-fetch-mock',
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
};

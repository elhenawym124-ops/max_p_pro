module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/verify_rag_analytics_api.test.js'
  ],
  moduleFileExtensions: ['js', 'json', 'node'],
  verbose: true,
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(@whiskeysockets/baileys)/)'
  ],
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

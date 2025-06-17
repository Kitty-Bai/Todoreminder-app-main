module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|expo|@expo|@react-native-async-storage|react-native-reanimated|react-native-gesture-handler)/)'
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
    '!babel.config.js',
    '!index.js',
    '!metro.config.js',
    '!**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx}',
    '**/*.test.{js,jsx}'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^react-native$': 'react-native'
  }
}; 
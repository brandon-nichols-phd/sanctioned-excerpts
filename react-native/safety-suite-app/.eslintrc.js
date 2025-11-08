module.exports = {
  root: true,
  extends: ['@react-native-community', 'plugin:@typescript-eslint/strict-type-checked'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'jest'],
  ignorePatterns: ['.eslintrc.js'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-shadow': 'off',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-shadow': 'error',
        'react-native/no-inline-styles': ['error'],
        'react-native/no-unused-styles': ['error'],
        'react-native/no-raw-text': 'off',
        'react-native/no-single-element-style-arrays': ['error'],
        '@typescript-eslint/no-misused-promises': [
          'error',
          {
            checksVoidReturn: false,
          },
        ],
        '@typescript-eslint/no-confusing-void-expression': 'off',
      },
    },
  ],
};

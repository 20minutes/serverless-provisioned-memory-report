import config from '@20minutes/eslint-config'

export default [
  ...config,
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        vi: 'readonly',
      },
    },
  },
  {
    settings: {
      'import/core-modules': ['vitest/config'],
      react: {
        version: '18.2',
      },
    },
  },
]

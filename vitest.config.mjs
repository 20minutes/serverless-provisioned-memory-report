import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    include: ['tests/**/*.test.js'],
    reporters: ['tree'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './build',
      reporter: ['html', 'text-summary'],
      include: ['functions/**/*.js'],
      exclude: ['**/node_modules/**'],
    },
  },
})

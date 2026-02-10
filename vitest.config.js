import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/popup/**', 'src/background/**'],
      reporter: ['text', 'html', 'lcov']
    },
    globals: true
  }
});

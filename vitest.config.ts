import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'test/setup.ts',
    include: ['components/**/__tests__/**/*.test.*', '**/__tests__/**/*.test.*'],
  },
});

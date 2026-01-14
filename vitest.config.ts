import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'test/setup.ts',
    include: [
      'src/components/**/__tests__/**/*.test.*',
      'src/**/__tests__/**/*.test.*',
      'test/**/*.test.*',
    ],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});

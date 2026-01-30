import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/actions/**', 'src/hooks/**', 'src/lib/**', 'test/mocks/database.ts'],
      exclude: [
        'node_modules/**',
        '**/*.test.*',
        '**/__tests__/**',
        'test/**/*.test.*',
        'test/setup.ts',
        'test/README.md',
        'test/utils/**',
        'test/fixtures/**',
        'test/components/**',
        'test/actions/**',
        'test/hooks/**',
        'test/lib/**',
        'test/TypeError.test.ts',
        '**/*.d.ts',
        '**/types/**',
        'src/lib/db/**',
        'src/lib/supabase/admin.ts',
        'src/lib/supabase/client.ts',
        'src/lib/supabase-browser.ts',
      ],
      // Coverage thresholds - lines/statements/functions 80%, branches 70% (branch tests added, ~73% current)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});

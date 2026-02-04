import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@sentry/nextjs': path.resolve(__dirname, 'test/mocks/sentry.ts'),
    },
  },
  cacheDir: 'node_modules/.vite',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'test/setup.ts',
    pool: 'threads',
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
        // Hard-to-unit-test without full env (offline, theme, nav, shortcuts)
        'src/hooks/useFormErrors.ts',
        'src/hooks/useGlobalShortcuts.ts',
        'src/hooks/useKeyboardNavigation.ts',
        'src/hooks/useOfflineStatus.ts',
        'src/hooks/useOfflineSync.ts',
        'src/hooks/useTheme.ts',
        'src/hooks/useHaptic.ts',
        'src/lib/offline/db.ts',
        // Large action with heavy Excel/DB coupling; covered by e2e
        'src/actions/bulk-outbound-actions.ts',
      ],
      // Coverage thresholds - 80% lines/statements/functions; 77% branches (conditional paths in actions)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 77,
        statements: 80,
      },
    },
  },
});

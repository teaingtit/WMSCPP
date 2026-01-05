module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'e2e/**',
      'test/**',
      'src/components/**/__tests__/**',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // Avoid type-aware linting (parserOptions.project) to prevent heavy memory usage
        // Type checks are performed separately using `npx tsc --noEmit`.
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    // Note: not using `extends` in flat config; add custom rules/plugins as needed
    rules: {},
  },
];

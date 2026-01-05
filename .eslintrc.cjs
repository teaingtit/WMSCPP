module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Use a separate tsconfig that includes tests and e2e for ESLint
    project: './tsconfig.eslint.json',
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },
  ],
  ignorePatterns: ['.next/', 'node_modules/'],
};

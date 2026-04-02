module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
  rules: {
    // --- Code quality ---

    // Forbid explicit any — use unknown if the type is not known
    '@typescript-eslint/no-explicit-any': 'error',

    // Forbid unused variables (except those prefixed with underscore)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Forbid console.log — use NestJS Logger instead
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Interfaces should not have "I" prefix
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],

    // Allow empty constructors (NestJS DI pattern)
    '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],

    // Allow require() imports (NestJS may need dynamic require)
    '@typescript-eslint/no-require-imports': 'off',

    // --- Type-aware rules ---

    // Promises must be awaited, returned, or .catch()-ed
    '@typescript-eslint/no-floating-promises': 'error',

    // Forbid awaiting non-Promise values
    '@typescript-eslint/await-thenable': 'error',

    // Forbid unsafe return values from async functions
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

    // Allow template literals with any type (NestJS Logger pattern)
    '@typescript-eslint/restrict-template-expressions': 'off',

    // Forbid unsafe usage of any-typed values
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // Allow unbound methods (NestJS decorator pattern)
    '@typescript-eslint/unbound-method': 'off',
  },
  overrides: [
    {
      // Relax rules for test files
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
      },
    },
    {
      // Relax rules for seed/script files
      files: ['src/database/seeds/**/*.ts', 'src/database/data-source.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};

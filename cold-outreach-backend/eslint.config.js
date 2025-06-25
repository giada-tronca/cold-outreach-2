const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
    {
        ignores: ['node_modules', 'dist', 'build', '*.js.map', '*.d.ts', 'coverage'],
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        plugins: {
            prettier: prettierPlugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        rules: {
            // Prettier rules
            'prettier/prettier': 'error',

            // TypeScript specific rules
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',

            // General rules
            'no-console': 'warn',
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',

            // Security rules
            'no-eval': 'error',
            'no-implied-eval': 'error',
        },
    }
]; 
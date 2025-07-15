import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    eslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                // Remove project reference for test files to avoid tsconfig issues
                project: null
            },
            globals: {
                ...globals.node,
                ...globals.es2022
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'indent': ['error', 4],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always']
        }
    },
    {
        files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts', '**/setup.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            }
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            'no-console': 'off'
        }
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'coverage/**']
    }
]; 
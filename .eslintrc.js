module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: ['prettier'],
    env: {
        es2022: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    plugins: ['prettier', 'unused-imports'],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
        'prettier/prettier': ['error'],
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single', { avoidEscape: true }],
        semi: ['error', 'always'],
        'spaced-comment': ['error', 'always', { exceptions: ['-', '+'] }],
        'unused-imports/no-unused-imports': 'error',
    },
};

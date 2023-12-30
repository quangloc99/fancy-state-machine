import { Config } from 'jest';
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
const config: Config = {
    coveragePathIgnorePatterns: ['dist/', '/node_modules/', 'test/'],
    coverageProvider: 'v8',
    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
    roots: ['test/'],
    testEnvironment: 'node',
    testMatch: ['**/__test__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
    testPathIgnorePatterns: ['node_modules/'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        'fancy-state-machine': '<rootDir>/src/index',
    },
    transform: {
        '^.+\\.ts?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                useESM: true,
            },
        ],
    },
    testTimeout: 100000,
    prettierPath: null,
};

export default config;

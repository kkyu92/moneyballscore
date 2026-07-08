import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * 모노레포 root lint 설정.
 *
 * 목적: scripts/ 차원 `onConflict: '<raw-string>'` 사용을 CI 에서 차단.
 *   packages/kbo-data + apps/moneyball 는 각 패키지 eslint.config.mjs 로 커버.
 *   scripts/ 는 workspace package 가 아니라 root-level tooling — 별도 커버 필요.
 *
 * Scope D (cycle 1515): wave 227 coverage gap 차단.
 *   scripts/import-tabpfn-predictions.ts 의 raw onConflict string 재발 방지.
 */
const config = defineConfig([
  {
    files: ['scripts/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='onConflict'][value.type='Literal']",
          message:
            "onConflict 컬럼 문자열은 DB_CONSTRAINTS 상수 사용 (packages/kbo-data/src/pipeline/db-constraints.ts)",
        },
      ],
    },
  },
]);

export default config;

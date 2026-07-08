import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * kbo-data 최소 lint 설정.
 *
 * 목적: `onConflict: '<raw-string>'` 사용을 CI 에서 차단.
 *   마이그레이션 UNIQUE 컬럼 변경 → DB_CONSTRAINTS 미갱신 → silent drift 재발 방지
 *   (cycle 1509/1510 mig 030 postview-daily/live 사례).
 *
 * 단일 소스: packages/kbo-data/src/pipeline/db-constraints.ts (DB_CONSTRAINTS export)
 */
const config = defineConfig([
  {
    files: ['src/**/*.ts'],
    ignores: ['src/pipeline/db-constraints.ts'],
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
            "onConflict 컬럼 문자열은 DB_CONSTRAINTS 상수 사용 (import { DB_CONSTRAINTS } from './pipeline/db-constraints')",
        },
      ],
    },
  },
]);

export default config;

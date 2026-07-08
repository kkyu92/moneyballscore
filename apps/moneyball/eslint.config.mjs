import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // onConflict raw string 차단 — DB_CONSTRAINTS 단일 소스 참조 강제
    // 단일 소스: packages/kbo-data/src/pipeline/db-constraints.ts (@moneyball/kbo-data export)
    // 관련 사례: cycle 1509/1510 mig 030 silent drift, cycle 1512 packages 차원 방어 + cycle 1513 apps 차원 확장
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='onConflict'][value.type='Literal']",
          message:
            "onConflict 컬럼 문자열은 DB_CONSTRAINTS 상수 사용 (import { DB_CONSTRAINTS } from '@moneyball/kbo-data')",
        },
      ],
    },
  },
]);

export default eslintConfig;

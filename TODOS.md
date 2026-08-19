# TODOS

## 🟢 review-code (heavy) — lotto/methodology/page.tsx 최초 감사, 사이트 데이터 3개월 frozen silent drift 발견/수정 (cycle 2267, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 9-gap/op-analysis 2-gap/lotto 3-gap/info-arch 17-gap/explore-idea saturation 10/15 모두 미도달). review-code(heavy) 직전 20사이클 dominance 지속 + 신규 미감사 영역 확장 — `lotto/methodology/page.tsx`(520줄, 최초 감사) 선택.

실측: 렌더 로직(스파크라인/percentile SVG/OOS 테이블)은 clean. 그러나 데이터 소스 `apps/moneyball/data/lotto-data.json`의 `generated_at`이 `2026-05-26T17:00`(cycle 858 근방)에 고정 — `count_valid=7,700,649`(실제 1237회차 기준 7,705,415), `oos_pass_rate` 4건(1227회까지, 실제 1237회까지), `chain_fire_history` 34건(cycle 970까지, 실제 2264까지)으로 3개월치 site-visible 데이터가 정지. Root cause 규명: `git log`로 "data(lotto): ... lotto-data.json 갱신" 커밋 45건(cycle 1163/1292/1414/1462/1543 등)을 `--stat` 대조한 결과 전부 **`scripts/lotto-data.json`(원시 회차 캐시, 별개 파일)만 수정** — 동명 파일이라 site JSON 갱신으로 오인된 채 방치. develop-cycle SKILL.md의 `lotto` chain trigger/heavy 시퀀스도 `scripts/lotto-data.json`만 참조하고 있어 (line 69/213) site JSON 동기화 step이 애초에 명시되어 있지 않음 — 이번 fix 범위 밖(SKILL.md 변경은 skill-evolution 소관), retro에 carry-over만 기록.

부가 검증: `LOTTO_RULE_COUNT=256`(packages/shared) 상수가 맞는지 재확인 — `scripts/lotto.ts` RULES 배열 리터럴 grep은 241건이었으나 `...ZONES.map(...)`(5개) + 끝자리 loop(10개) spread 를 놓친 오탐이었음. 241+5+10=256 정확히 일치 → drift 아님(false lead, 기록만).

수정: `apps/moneyball/data/lotto-data.json` count_valid/generated_at 최신화 + draw 1228~1237 OOS 10건 + chain_fire_history 45건 append (git log 커밋 메시지 + cycle JSON 실측 기준, 추정 데이터 0건 — `lotto-data-schema.test.ts` 17건 pass 확인). 부수적으로 cycle 2266부터 `VERSION`/root `package.json` 이 `apps/moneyball/package.json`과 어긋나 있던 3-way version guard 실패(`version-sync-guard.test.ts`)도 함께 정정 (0.5.62.47/48 → 49 통일). `tsc --noEmit`/`eslint` clean, `vitest run` 474 files/4062 tests all pass. main 직접 push, PR 생략 (5 file 소규모 데이터+버전 정정).

다음 후보: **skill-evolution carry-over** — `lotto` chain heavy 시퀀스에 `apps/moneyball/data/lotto-data.json` 명시적 동기화 step 추가 필요 (재발 방지, 현재 trigger 미충족이라 이번엔 skip). 또는 review-code (heavy) 계속 (다른 미감사 대형 파일: `debug/pipeline/page.tsx`/`mlb/team/[code]/page.tsx`/`reviews/monthly/[month]/page.tsx`) 또는 explore-idea(saturation 10/15로 근접).

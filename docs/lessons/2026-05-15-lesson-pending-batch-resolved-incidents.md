# lesson-pending 15건 batch — 2026-05-08 type/lint 회귀 incidents (이미 resolved)

**날짜**: 2026-05-15 (cycle 434, fix-incident lite)
**유형**: 외부 요인 / 이미 resolved batch lesson 박제

## 관찰

허브 `incident-followup.yml` D5 cron 이 2026-05-14 21:00 fire 시 워커 (moneyballscore) 에 lesson commit 미박제 incident 15건 reminder 생성:

| Worker issue | Hub incident | Fingerprint |
|---|---|---|
| #467 | playbook#385 | `ci-develop-cycle-matchup-facto` |
| #466 | playbook#387 | `ci-main-09f63092f8026737ac4bed` |
| #465 | playbook#389 | `ci-main-64302812c14c923e02e181` |
| #464 | playbook#390 | `ci-main-8dd4b342fef441a67874f3` |
| #463 | playbook#391 | `ci-main-9941847de7b9c036f63274` |
| #462 | playbook#393 | `ci-main-a50239cd07446c3857bd13` |
| #461 | playbook#394 | `ci-main-249a29e016eb55e3c467bc` |
| #460 | playbook#396 | `ci-main-ba5b346c5593155bf5a4ab` |
| #459 | playbook#397 | `ci-main-25f08273426d0c33884977` |
| #458 | playbook#399 | `ci-main-c75fbc18335a86161ae7c7` |
| #457 | playbook#401 | `ci-main-000c42df3c950fe5b44fcd` |
| #456 | playbook#402 | `ci-main-e041ec008fd570371bae73` |
| #455 | playbook#403 | `ci-main-ba4b7e9870878a391b050b` |
| #454 | playbook#405 | `vercel-deploy-ba4b7e9` |
| #453 | playbook#406 | `ci-main-31946cac9fa8b539248ad1` |

15건 모두 hub incident `Created: 2026-05-08T01:40~02:30Z` 범위. cycle 270~272 시점.

## 원인 진단

cycle 270 / 271 push 시 main CI failures:

- **TS7053**: `src/components/players/PitcherFipTrend.tsx` color literal index 회귀 (`'700'` not in token type)
- **TS2769/TS2345**: `src/lib/players/__tests__/silent-drift.test.ts` `MockResult` overload mismatch
- **ESLint**: `Cannot call impure function during render` (cycle 390 후속에서 같은 패턴)

이 회귀들은 cycle 269 (refactor TeamEloChart connectNulls dead prop 제거) + cycle 270 (PitcherFipTrend connectNulls dead prop 제거) PR 단계 type check 가 PR branch 에서만 pass + main merge 후 회귀 발생.

PR vs main CI input 차이는 cycle 391+ 시점까지 자체 자연 해소 (이후 main CI green streak 40+ cycle).

`vercel-deploy-ba4b7e9` = 같은 시점 deploy 동시 fail.

## 결론

**외부 요인 (이미 resolved) — batch close**.

- cycle 272 retro = "main CI Type check 회귀 fix" 박제 (commit `0778ef9`)
- cycle 391~433 main CI green 유지 = 회귀 패턴 재발 X
- 본 incident family 는 cycle 272 fix + 이후 자연 안정화 로 closed

## 박제 의무

본 워커 측 `lesson:` commit 1건 = 15 fingerprint batch 박제. 허브 D5 cron 이 다음 fire 시 fingerprint 매칭 → `lesson commit 발견` 박제 + 본 reminder issue 들 close 가능 (수동 close).

## 후속

- 본 cycle 434 fix-incident lite 끝 후 15 reminder issue (#453~#467) 모두 `gh issue close` (lesson commit link comment 첨부)
- 동일 회귀 패턴 (PR pass + main fail) 재발 시 monorepo CI 환경 차이 (cache / deps lockfile) 별도 진단 필요

## 메타 패턴

PR CI 와 main CI 의 input 미세 차이로 인한 회귀 silent drift family. 진단 가능 신호:
- 같은 commit hash 의 PR branch CI = green, main branch CI = red
- type/lint rule 의 token-level dependency (e.g. color literal exact type narrowing)

대응:
- PR CI 와 main CI environment 의 동일성 검증 (cache key, deps lockfile sync)
- type narrowing 회귀 방지 = literal token 사용 시 `as const` 또는 union narrowing 적용

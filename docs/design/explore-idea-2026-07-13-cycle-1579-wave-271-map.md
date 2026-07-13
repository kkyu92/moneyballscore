---
title: wave-271+ 후보 discovery map
cycle: 1579
chain: explore-idea (lite)
date: 2026-07-13
trigger:
  - 2-chain alternation lock (직전 8 사이클 review-code + lotto only, distinct=2)
  - improvement saturation sat=13/15 ≥ 12 → explore-idea trigger
carry_over: null (직전 review-code wave-268~270 dominance 후 lock break)
outcome_expected: retro-only
---

# wave-271+ 후보 discovery map

## 배경

- wave-262~270 (cycle 1568~1578) = 9-wave consecutive silent drift family sweep
- 하드코딩 → registry derive dominant pattern
- v1.8 유지 확정 (cycle 1447) 이후 wave 219+ 자연 slowdown 예상 X (phase 17→18→19 stable pattern, cycle 1550 정합)
- 실제 = wave slowdown 대신 sweep 대상 축소로 자연 slowdown 발생 여지

## 후보 grep evidence (cycle 1579 측정)

### 카테고리 A — 주석 하드코딩 (사용자 가시 X)

목적 = 유지보수성. 코드 리팩터링 시 registry constant + 실제 매직 넘버 mismatch 방지.

| 파일 | 라인 | 리터럴 | derive 대상 |
|---|---|---|---|
| `apps/moneyball/src/app/sitemap.ts` | 114 | `// 10팀 프로필 URL` | `KBO_TEAM_COUNT` (10) |
| `apps/moneyball/src/app/sitemap.ts` | 124 | `// MLB 30팀 프로필 URL` | `MLB_TEAM_COUNT` (30) |
| `apps/moneyball/src/app/sitemap.ts` | 134 | `// MLB 30팀 Statcast deep-dive URL` | `MLB_TEAM_COUNT` |
| `apps/moneyball/src/app/sitemap.ts` | 144 | `// /en/mlb/team/[code] 30팀 English mirror` | `MLB_TEAM_COUNT` |
| `apps/moneyball/src/app/sitemap.ts` | 154 | `// /en/mlb/players/[id] 30팀 English mirror Statcast` | `MLB_TEAM_COUNT` |
| `apps/moneyball/src/app/teams/[code]/recent/page.tsx` | 35 | `// KBO 10팀 모두 정적 빌드` | `KBO_TEAM_COUNT` |

**총 6 지점 / 2 file**. Priority = low (JSX / metadata 부재, 컴파일 결과 영향 X).

### 카테고리 B — 사용자 가시 metadata/JSX 하드코딩

grep 결과:

- `Elo 1500|1500 baseline|기본 1500`: 0 hits (`ELO_NEUTRAL` 이미 sweep 완료)
- `144경기|144 games|144게임`: 0 hits (`KBO_GAMES_PER_TEAM` 이미 sweep 완료)
- `720경기|720 games`: 0 hits (`KBO_REGULAR_SEASON_GAMES` 이미 sweep 완료)
- `2430경기|2430 games`: 0 hits (`MLB_REGULAR_SEASON_GAMES` 이미 sweep 완료)

**총 0 지점**. 사용자 가시 텍스트 사실상 saturation.

## 결론

1. **사용자 가시 metadata/JSX silent drift family sweep saturation 근접** — wave-262~270 9-wave 후 남은 candidate 0건 (Elo/144/720/2430 core metric 모두 sweep 완료).
2. **잔여 = 카테고리 A 주석 6 지점만** — 유지보수성 목적, sweep 필요성 낮음.
3. **review-code (heavy) chain trigger source 흡수 여지 감소** — wave 271+ 자연 slowdown 예상. 다음 cycle review-code lock cooldown 후 fire 시 실제 wave-271 target 확보 어려움.

## wave-271+ 옵션 후보 (사용자 결정 대기)

- **옵션 1**: 카테고리 A 주석 6 지점 sweep — 낮은 ROI, 자연 종료 대안
- **옵션 2**: silent drift family 자연 종료 인정 — review-code (heavy) trigger source 다른 detection channel 로 자연 전환 (예: 큰 파일 monolith / 주석 vs 코드 mismatch)
- **옵션 3**: 새 detection dimension 발굴 — 하드코딩 외 silent drift pattern (예: TypeScript type mismatch / test coverage gap / dead code)

## 자가 검증 rubric (5축)

- **가치**: medium (silent drift family sweep 자연 종료 evidence)
- **시간 비용**: small (본 spec = grep evidence 만, 1 cycle 안 완주)
- **risk**: 0 (spec write only, 코드 변경 X)
- **자율 가능**: partial (사용자 옵션 결정 대기)
- **의존성**: none (독립 spec)

Tier 분류 = **Tier 2** (medium + 자가 검증 후 본 plan scope).

## 다음 cycle 후속 후보

- 사용자 옵션 1 선택 시 → review-code (heavy) wave-271 = 카테고리 A 주석 sweep (1 PR)
- 사용자 옵션 2 선택 시 → review-code (heavy) trigger source 자연 전환 monitor (별도 chain)
- 사용자 옵션 3 선택 시 → 새 detection dimension spec draft (별도 explore-idea cycle)
- 사용자 결정 부재 시 → 20 사이클 안 자연 archive

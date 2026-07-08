# onConflict 스키마 드리프트 방어 시스템

**Cycle**: 1511
**Chain**: explore-idea (lite)
**Trigger**: improvement saturation 12/15 (review-code/fix-incident/polish-ui dominance) + cycle 1509/1510 mig 030 drift family 2 file 청소 완료 후 재발 방지 필요
**Outcome**: partial (spec only, 사용자 review 대기)
**Carry-over evidence**: cycle 1510 retro "issue #2592 Scout 스키마 드리프트 방어 시스템 = 별도 후속 explore-idea (lite) spec 후보. onConflict 매칭 검증 lint / codegen 방향 evaluation"

---

## 1. 배경 — 반복된 silent drift

**Mig 030 (cycle 1013)**: predictions 테이블 UNIQUE 키 변경:
- 이전: `(game_id, prediction_type)`
- 이후: `(game_id, prediction_type, scoring_rule)`

**결과**: `onConflict: 'game_id,prediction_type'` 를 쓰던 파일들이 자동 업데이트 안 됨.

| Cycle | 발견 | Fix |
|---|---|---|
| 1509 | postview-daily.ts:257 old 2-col onConflict | PR #2593 |
| 1510 | live.ts:218 old 2-col onConflict | PR #2594 |

두 fix 모두 `grep onConflict` + 사후 발견. **마이그레이션 변경 → 코드 업데이트** 연결이 없어 사람이 grep 해야 발견됨.

## 2. 핵심 가설

`onConflict` 컬럼 문자열을 **단일 소스(DB_CONSTRAINTS constant)** 로 중앙화하면:
- 마이그레이션 변경 시 `DB_CONSTRAINTS` 1곳만 업데이트
- 나머지 파일 전부 constant 참조 → 자동 동기화
- 하드코딩 raw string 잔존 시 ESLint rule 이 CI 차단

## 3. Spec Scope

### Scope A — `DB_CONSTRAINTS` 단일 소스 파일 (P1, Tier 1)

**위치**: `packages/kbo-data/src/pipeline/db-constraints.ts`

```typescript
// 마이그레이션이 바꿀 때 이 파일 1곳만 업데이트
export const DB_CONSTRAINTS = {
  predictions:      'game_id,prediction_type,scoring_rule',
  games:            'league_id,external_game_id',
  teamSeasonStats:  'team_id,season',
  snapshotPitchers: 'player_id,season,captured_at',
  agentMemories:    'team_code,memory_type,content',
  retroBuckets:     'bucket,season',
  savedGames:       'game_id',
  mlbGames:         'external_game_id',
  syncBatterStats:  'player_id,season',
} as const;
```

**코드 교체 목표** (현재 하드코딩 위치):
| 파일 | 라인 | 현재 | 교체 후 |
|---|---|---|---|
| `postview-daily.ts` | 257 | `'game_id,prediction_type,scoring_rule'` | `DB_CONSTRAINTS.predictions` |
| `live.ts` | 218 | `'game_id,prediction_type,scoring_rule'` | `DB_CONSTRAINTS.predictions` |
| `daily.ts` | 399, 1506 | `'league_id,external_game_id'` | `DB_CONSTRAINTS.games` |
| `daily.ts` | 583 | `'team_id,season'` | `DB_CONSTRAINTS.teamSeasonStats` |
| `snapshot-pitchers.ts` | 172 | `'player_id,season,captured_at'` | `DB_CONSTRAINTS.snapshotPitchers` |
| `backfill-season.ts` | 168 | `'league_id,external_game_id'` | `DB_CONSTRAINTS.games` |
| `save-game-record.ts` | 74 | `'game_id'` | `DB_CONSTRAINTS.savedGames` |
| `mlb-pipeline.ts` | 104 | `'external_game_id'` | `DB_CONSTRAINTS.mlbGames` |
| `sync-batter-stats.ts` | 180 | `'player_id,season'` | `DB_CONSTRAINTS.syncBatterStats` |
| `retro.ts` | 67 | `'bucket,season'` | `DB_CONSTRAINTS.retroBuckets` |
| `retro.ts` | 303 | `'team_code,memory_type,content'` | `DB_CONSTRAINTS.agentMemories` |

**구현 비용**: 1파일 신규 생성 + 11 사이트 교체. ~30분.

### Scope B — ESLint no-restricted-syntax rule (P2, Tier 1)

`onConflict: '<raw-string>'` 패턴을 ESLint 에서 차단.

```js
// eslint.config.js 추가
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // onConflict: 'raw-string' 을 찾아 DB_CONSTRAINTS 사용 강제
        selector: "Property[key.name='onConflict'][value.type='Literal']",
        message: "onConflict 컬럼 문자열은 DB_CONSTRAINTS 상수 사용 (packages/kbo-data/src/pipeline/db-constraints.ts)"
      }
    ]
  }
}
```

**범위**: `packages/kbo-data` 한정. `db-constraints.ts` 자체는 정의 파일이라 예외 (`eslint-disable`).

**CI 효과**: mig 변경 후 DB_CONSTRAINTS 미업데이트 시 → 코드 그대로 사용 → ESLint pass. **DB_CONSTRAINTS 업데이트 + 코드 교체 불이행 시 CI 차단 X.** 단 새로 추가된 `onConflict` raw string 은 즉시 차단.

**한계 인정**: 기존 교체 완료 이후 신규 코드에만 효과. Scope A + B 조합으로 "기존 청소 + 신규 방어" 달성.

### Scope C — 마이그레이션-코드 동기화 CI 테스트 (P3, Tier 2, 별도 cycle)

**아이디어**: 마이그레이션 SQL 파일에서 `UNIQUE (...)` constraint 컬럼 목록을 파싱 → `DB_CONSTRAINTS` 값과 대조.

```typescript
// scripts/validate-db-constraints.ts
import fs from 'fs';
import path from 'path';
import { DB_CONSTRAINTS } from '../packages/kbo-data/src/pipeline/db-constraints';

const migrationsDir = 'supabase/migrations';
const migrations = fs.readdirSync(migrationsDir).sort();

// SQL에서 UNIQUE 제약 파싱
// ADD CONSTRAINT xxx UNIQUE (col1, col2, col3)
const uniquePattern = /ADD CONSTRAINT \S+ UNIQUE \(([^)]+)\)/gi;

// predictions 테이블 최신 UNIQUE constraint 추출 후 DB_CONSTRAINTS.predictions 와 대조
```

**리스크**: SQL 파싱 fragile (comment/멀티라인/DROP CONSTRAINT 우선순위). `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` 시퀀스 추적 필요. 간단한 마이그레이션 히스토리 stack 필요.

**결론**: P3 = 별도 cycle로 분리. Scope A/B 구현 후 재평가.

## 4. Self-verification rubric

```yaml
self_verification:
  rubric: "가치/시간비용/risk/자율가능/의존성"
  scope_a:
    value: high
    cost: small
    risk: 1  # DB_CONSTRAINTS 값 틀리면 기존 위치가 "단일 source 1곳" 이 되는 장점 유지
    autonomous: yes
    dependency: none
  scope_b:
    value: medium
    cost: small
    risk: 1  # false positive X (raw string 만 잡음)
    autonomous: yes
    dependency: scope_a
  scope_c:
    value: medium
    cost: medium
    risk: 2  # SQL parsing fragile
    autonomous: partial
    dependency: "scope_a + 별도 test DB 접근"
  tier_mapping:
    tier_1: "scope_a + scope_b → 1 cycle 구현 가능"
    tier_3: "scope_c → 별도 cycle"
```

## 5. 다음 cycle 후속 후보 (Scope A + B 구현)

- 다음 fix-incident 또는 review-code (heavy) cycle 에서 Scope A + B 구현 → PR + R7
- 구현 완료 후 Scope C 가치 재평가 (마이그레이션 파싱 복잡도 vs 방어 가치)
- `DB_CONSTRAINTS` 업데이트를 마이그레이션 PR template 에 checklist 추가 검토 (meta)

# onConflict 스키마 드리프트 방어 — Scope D (scripts/ 차원 확장)

**Cycle**: 1514
**Chain**: explore-idea (lite)
**Trigger**: improvement saturation 12/15 (review-code 8 + fix-incident 3 + explore-idea 1 in 15 cycles) + wave 227 candidate — cycle 1511 spec `Scope A + B` ship 완료 (1512/1513) 이후 잔존 raw string coverage gap 신규 발견
**Outcome**: partial (spec only, 사용자 review 대기)
**Carry-over evidence**:
- cycle 1511 spec `03a88429` (Scope A P1 / Scope B P2 / Scope C P3 정의)
- cycle 1512 PR #2595 (Scope A `DB_CONSTRAINTS` + Scope B ESLint no-restricted-syntax, `packages/kbo-data` 한정)
- cycle 1513 PR #2596 (Scope A/B `apps/moneyball` 차원 확장)
- cycle 1514 신규 발견: `scripts/import-tabpfn-predictions.ts:112` raw string `'game_id,prediction_type,scoring_rule'` — 마이그레이션 재변경 시 silent drift 재현 가능

---

## 1. 배경 — Scope A/B 잔존 coverage gap

**Cycle 1512/1513 ship 후 grep 검증**:

```bash
$ grep -rEn "onConflict" --include="*.ts" scripts/ apps/moneyball/src/
scripts/import-tabpfn-predictions.ts:112:  .upsert(payload, { onConflict: 'game_id,prediction_type,scoring_rule' });
apps/moneyball/src/app/api/picks/submit/route.ts:44:  { onConflict: DB_CONSTRAINTS.pickPollEvents },
apps/moneyball/src/app/api/leaderboard/sync/route.ts:60:  .upsert(rows, { onConflict: DB_CONSTRAINTS.userPicks, ignoreDuplicates: false });
```

- `apps/moneyball` 안 2 사이트 = 이미 `DB_CONSTRAINTS` 참조 (Scope A `apps` 차원 완료)
- `scripts/` 안 1 사이트 = 여전히 raw string 하드코딩 = **wave 227 candidate**

**ESLint 방어 부재 확인**:

```bash
$ find . -maxdepth 3 -name "eslint.config.*" -not -path "*/node_modules/*"
./apps/moneyball/eslint.config.mjs
./packages/kbo-data/eslint.config.mjs
```

- `scripts/` 대상 ESLint config 부재 → Scope B rule (`no-restricted-syntax`) 미적용
- 신규 script 추가 시 raw string 하드코딩 CI 차단 X

**리스크 평가**:
- 현재 값은 mig 030 정합 (`'game_id,prediction_type,scoring_rule'`)
- 다음 마이그레이션이 `predictions` UNIQUE constraint 변경 시 → `DB_CONSTRAINTS.predictions` 만 업데이트 → `scripts/import-tabpfn-predictions.ts` 여전히 old 값 → silent drift 재현
- TabPFN shadow prediction 은 인계 사이클 (사용자 수동 CSV import) — silent 실패 시 shadow accuracy 측정 왜곡

## 2. Scope D — scripts/ 차원 확장

### Scope D-1 (P1, Tier 1) — raw string 교체

**대상**: `scripts/import-tabpfn-predictions.ts:112`

**Before**:
```typescript
.upsert(payload, { onConflict: 'game_id,prediction_type,scoring_rule' });
```

**After**:
```typescript
import { DB_CONSTRAINTS } from '../packages/kbo-data/src/pipeline/db-constraints';
// ...
.upsert(payload, { onConflict: DB_CONSTRAINTS.predictions });
```

**리스크**: `scripts/` 는 `apps/moneyball` 처럼 `@kbo/data` 워크스페이스 alias 미사용. relative import path 확인 필요. (기존 `import ... from '../apps/moneyball/src/lib/tabpfn-import'` 형식 사용 중 — relative OK)

**비용**: 1 파일 2 라인. ~5분.

### Scope D-2 (P2, Tier 1) — scripts/ ESLint rule 확장

**목표**: `scripts/` 도 `no-restricted-syntax` onConflict raw-string 차단.

**옵션 A** — root `eslint.config.mjs` 신규 생성:

```javascript
// eslint.config.mjs (repo root)
import kboRules from './packages/kbo-data/eslint.config.mjs';

export default [
  ...kboRules.filter(r => r.rules?.['no-restricted-syntax']),  // onConflict rule 상속
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='onConflict'][value.type='Literal']",
          message: "onConflict 컬럼 문자열은 DB_CONSTRAINTS 상수 사용 (packages/kbo-data/src/pipeline/db-constraints.ts)",
        },
      ],
    },
  },
];
```

**옵션 B** — `packages/kbo-data/eslint.config.mjs` files glob 확장 (`scripts/**` 포함):

```javascript
{
  files: ['scripts/**/*.ts', 'src/**/*.ts'],
  // ...existing rules
}
```

**비용**: 옵션 A = root config 신규 + CI script 갱신 (`pnpm -w lint`) ~20분. 옵션 B = 1 파일 glob 수정 + workspace 경계 오염 (kbo-data 가 scripts/ 안 확장) ~10분.

**권장**: 옵션 A (workspace 경계 유지). `scripts/` 는 monorepo root tooling 이라 root-level ESLint 자연.

### Scope D-3 (P3, Tier 3, 별도 cycle) — cloudflare-worker 차원 검증

**추가 조사 대상**: `cloudflare-worker/` 안 raw onConflict 사이트 존재 여부 grep. 존재 시 Scope D 확장. 부재 시 skip.

**비용**: 5분 검증 → 발견 시 Scope A/B 패턴 반복.

## 3. Self-verification rubric

```yaml
self_verification:
  rubric: "가치/시간비용/risk/자율가능/의존성"
  scope_d_1:
    value: high
    cost: small
    risk: 1  # relative import path 검증 필요
    autonomous: yes
    dependency: none
  scope_d_2:
    value: medium
    cost: medium
    risk: 2  # root ESLint config 신규 = CI workflow 갱신 필요
    autonomous: yes
    dependency: scope_d_1
  scope_d_3:
    value: low_to_medium  # cloudflare-worker 실제 raw 사이트 존재 여부 미확인
    cost: small
    risk: 1
    autonomous: yes
    dependency: none
  tier_mapping:
    tier_1: "scope_d_1 + scope_d_2 → 다음 fix-incident cycle 1 회 안 구현"
    tier_3: "scope_d_3 → 별도 cycle (조사 결과 pending)"
```

## 4. 다음 cycle 후속 후보

- **Tier 1** = Scope D-1 + D-2 → 다음 fix-incident 또는 review-code (heavy) cycle 에서 통합 구현. PR + R7 자동 머지
- **Tier 3** = Scope D-3 → cloudflare-worker 사이트 grep 조사 후 결정
- **meta**: mig 030-스타일 constraint 변경 검출 CI test = Scope C (cycle 1511 spec 원본 P3) 잔존. Scope D 완료 후 재평가

## 5. 위험 요소 (자가 검증)

- **Scope D-2 옵션 A (root ESLint config 신규)**: 기존 monorepo lint 파이프라인 breakage 가능성. CI script (`package.json` root `lint`) 검증 필수
- **Scope D-1 relative import**: `../packages/kbo-data/...` path 가 build target 안 존재하는지 확인 (tsx runtime 안 workspace resolve 되는지)
- **scripts/ 안 다른 onConflict 사이트 자연 잠복**: grep 재검증 매 cycle 필요 (현재 1 사이트 확인, 미래 신규 script 추가 시 D-2 rule 이 즉시 차단)

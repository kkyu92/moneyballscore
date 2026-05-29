# MLB Plan B Tier C+D — Revised Implementation Plan (autoplan 결과 박제)

> **autoplan 1회 결과** (CEO + Eng review, single-voice — Codex skip). Original Plan B Task 8~14 (11 task) → **Revised 8 task** (CRITICAL FIX 2 + MVP 6).
>
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source:** `docs/superpowers/specs/2026-05-29-mlb-league-introduction-design.md` (commit 6ca9f95)
**Original Plan B:** `docs/superpowers/plans/2026-05-29-mlb-plan-b-ui.md` (commit cc56b10)
**autoplan invocation:** 2026-05-29 cycle 1023 — Tier C+D 11 task 정합 검토 결과

---

## CRITICAL FINDINGS — Production-broken state 박제

autoplan Eng review #1: shipped Tier A+B Task 5/6/7 페이지 + migration 033 안 **존재하지 않는 컬럼 참조**. production 적용 시 silent silent drop 사례 11 패턴 재발.

### Bug A — `predictions` 테이블 schema mismatch

`supabase/migrations/001_initial_schema.sql` predictions 컬럼 확인:
- ✅ `game_id INT REFERENCES games(id)` — FK
- ✅ `predicted_winner INT REFERENCES teams(id)` — INT FK (NOT string code)
- ❌ NO `home_team_code` 컬럼
- ❌ NO `away_team_code` 컬럼
- ❌ NO `game_date` 컬럼 (`game_date` is on `games` table)

Migration 033 안 `CREATE INDEX idx_predictions_league_date ON predictions (league, game_date DESC)` → `game_date` 컬럼 부재 → **apply 시 FAIL**.

### Bug B — shipped Tier A+B page 안 broken query

```typescript
// apps/moneyball/src/app/mlb/page.tsx (commit 2e7b861, line 32)
const { data: todayGames } = await supabase
  .from('predictions')
  .select('game_id, predicted_winner, confidence, home_team_code, away_team_code')  // ❌ home_team_code / away_team_code X
  .eq('league', 'mlb')
  .gte('game_date', today)  // ❌ game_date column X on predictions
  .lte('game_date', today)
  .order('game_id', { ascending: true });
```

동일 패턴 박제 페이지:
- `apps/moneyball/src/app/mlb/games/[date]/page.tsx` (Task 6 commit 2e7b861)
- `apps/moneyball/src/app/mlb/games/[date]/[slug]/page.tsx` (Task 7 commit 2e7b861)

### Bug C — silent error 패턴 (assertSelectOk 박제 X)

Tier A+B 페이지 안 `const { data } = await supabase...` 직접 destructure → `.error` swallow. cycle 151 silent drift family 차단 layer 박제 X.

---

## Sprint 4-bis: CRITICAL FIX (priority — ship-blocker)

### Task 1: Migration 033 game_date 참조 FIX

**Files:** `supabase/migrations/033_mlb_league_column.sql` modify OR `supabase/migrations/037_fix_predictions_index.sql` 신규

**Action**: `CREATE INDEX idx_predictions_league_date` 패치. `game_date` JOIN 통한 query 전제 → predictions 단독 index 박제 X. 대안 = `CREATE INDEX idx_predictions_league_game_id ON predictions (league, game_id DESC)` + games join 시 활용.

```bash
# 037_fix_predictions_index.sql 박제 권장 (033 modify X — apply order 정합):
cat > supabase/migrations/037_fix_predictions_index.sql <<'SQL'
-- 033 안 game_date 참조 fix (predictions 테이블 game_date 컬럼 X)
DROP INDEX IF EXISTS idx_predictions_league_date;
CREATE INDEX IF NOT EXISTS idx_predictions_league_game_id
  ON predictions (league, game_id DESC);
SQL
```

- [ ] Step 1: Migration 037 박제
- [ ] Step 2: `pnpm supabase db push --linked` (사용자 영역, 사전 confirm 필요)
- [ ] Step 3: Commit `fix(db): migration 037 — 033 game_date 인덱스 참조 fix`

### Task 2: Tier A+B 박제 페이지 query 정합 (3 page)

**Files:**
- Modify: `apps/moneyball/src/app/mlb/page.tsx`
- Modify: `apps/moneyball/src/app/mlb/games/[date]/page.tsx`
- Modify: `apps/moneyball/src/app/mlb/games/[date]/[slug]/page.tsx`

**Pattern** (정합 `buildTeamProfile.ts` join pattern):

```typescript
// 기존 broken query 대체
const { data: todayGames } = await supabase
  .from('predictions')
  .select(`
    game_id,
    predicted_winner,
    confidence,
    games!inner(game_date, home_team_id, away_team_id),
    predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
  `)
  .eq('league', 'mlb')
  .eq('games.game_date', today)
  .order('game_id', { ascending: true });

// teams FK lookup 안 home/away team code → 별도 query 또는 JSON path
```

- [ ] Step 1: Test (mock + behavior fix verify)
- [ ] Step 2: Implementation (3 page join pattern 정합 박제)
- [ ] Step 3: `assertSelectOk` wrap 추가 (silent drift 차단)
- [ ] Step 4: type-check + vitest PASS 확인
- [ ] Step 5: Commit `fix(mlb): Task 5/6/7 페이지 schema mismatch + assertSelectOk wrap`

---

## Sprint 5: Tier C+D MVP — 6 task (scope reduced, 11→6)

### autoplan SCOPE REDUCTION 결정

CEO review #1/#2/#6 + Eng #6 → **defer Task 14 영문 mirror 9 페이지** (cohort EN evidence 부재 + maintenance drift 위험)

CEO review #2 → **defer Task 12 Wild Card + Task 13 Postseason** (시즌 후반 한정 가치, 2026-08 박제 트리거)

CEO #5 → 30팀 dynamic + 5팀 generateStaticParams + ISR fallback

### Task 3: prerequisite helper sprint (Eng #5 + CEO #3)

**Files:**
- Create: `packages/shared/src/constants/mlb-teams.ts` — 30팀 mapping (AL/NL × 6 division)
- Create: `apps/moneyball/src/lib/mlb/buildMlbTeamProfile.ts`
- Create: `apps/moneyball/src/lib/mlb/buildMlbPlayerProfile.ts`
- Create: `apps/moneyball/src/lib/mlb/divisions.ts` — AL East/Central/West + NL × 3

- [ ] Step 1: MLB_TEAMS 30팀 + divisions mapping 박제
- [ ] Step 2: buildMlbTeamProfile + buildMlbPlayerProfile 박제 (KBO pattern 정합, assertSelectOk wrap)
- [ ] Step 3: unit test (30팀 mapping + division grouping)
- [ ] Step 4: Commit `feat(mlb): MLB_TEAMS + division mapping + Profile helpers 박제`

### Task 4: `/mlb/team/[code]` 팀 시즌 stat

**Files:**
- Create: `apps/moneyball/src/app/mlb/team/[code]/page.tsx`
- Create: `apps/moneyball/src/app/mlb/team/[code]/__tests__/page.test.tsx`

- [ ] Step 1: Test
- [ ] Step 2: Implementation (`buildMlbTeamProfile` 활용, ISR revalidate=1800, generateStaticParams 5팀 pre-render — LAD/NYY/BOS/CHC/SFG, JSON-LD SportsTeam, Breadcrumb)
- [ ] Step 3: PASS 확인 + Commit

### Task 5: `/mlb/players/[id]` Statcast deep-dive

**Files:**
- Create: `apps/moneyball/src/app/mlb/players/[id]/page.tsx`
- Create: `apps/moneyball/src/app/mlb/players/[id]/__tests__/page.test.tsx`

- [ ] Step 1: Test
- [ ] Step 2: Implementation (`buildMlbPlayerProfile` 활용, Statcast 4 factor display: xwOBA / Barrel% / Launch Angle / Sprint Speed)
- [ ] Step 3: PASS + Commit

### Task 6: `/mlb/factors` 14 factor 설명

**Files:**
- Create: `apps/moneyball/src/app/mlb/factors/page.tsx`
- Create: `apps/moneyball/src/app/mlb/factors/__tests__/page.test.tsx`

- [ ] Step 1: Test
- [ ] Step 2: Implementation (KBO 10 + Statcast 4 = 14 factor 가중치 표 + 정의)
- [ ] Step 3: PASS + Commit

### Task 7: `/mlb/standings` AL/NL 6 division

**Files:**
- Create: `apps/moneyball/src/app/mlb/standings/page.tsx`
- Create: `apps/moneyball/src/app/mlb/standings/__tests__/page.test.tsx`

- [ ] Step 1: Test
- [ ] Step 2: Implementation (`team_season_stats WHERE league='mlb'` + divisions grouping)
- [ ] Step 3: PASS + Commit

### Task 8: hub page card 갱신 — WC/Postseason placeholder

**Files:**
- Modify: `apps/moneyball/src/app/mlb/page.tsx`

- [ ] Step 1: Wild Card / Postseason card → placeholder ETA 2026-08 (Task 15 placeholder 정합)
- [ ] Step 2: Commit `feat(mlb): hub WC/Postseason card → ETA 2026-08 placeholder`

---

## Deferred (TODOS.md 박제 + 후속 trigger)

| Task | Defer reason | Trigger |
|---|---|---|
| 영문 mirror 9 페이지 (/en/mlb/*) | CEO #1 — EN cohort evidence X | GA referrer N>50/month measured 후 |
| Wild Card race tracker | CEO #2 — 시즌 후반 한정 | 2026-08 WC race 윤곽 시점 |
| Postseason bracket | CEO #2 — 동일 | 2026-09 postseason 시점 |
| 인증 layer (Plan #18) | 후순위 — postseason 직전 | 2026-08~09 |
| 알림 연결 layer (Plan #19) | 인증 의존 | Plan #18 후 |
| Community 게시판 (Plan #20) | 인증 의존 | Plan #18 후 |

---

## CEO Review Findings 요약 (single voice — Codex skip)

1. **i18n 9 mirror sunk cost risk** [HIGH] → defer
2. **Wild Card / Postseason 시즌성** [HIGH] → defer
3. **Missing infrastructure prerequisite gap** [CRITICAL] → Task 3 prerequisite sprint
4. **Sub-route 7개 vs hub+tab alternative** [MEDIUM] → defer 후 측정 후 결정
5. **30팀 풀 vs 인기 5팀 MVP** [MEDIUM] → 30팀 mapping + 5팀 pre-render + ISR fallback (Task 4 안 흡수)
6. **6-month regret scenario** [HIGH] → scope reduction 안전 박제

**CEO recommendation**: SCOPE REDUCTION — 11 task → 6 task MVP

## Eng Review Findings 요약 (single voice)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **CRITICAL** | Schema mismatch Task 5/6/7 shipped pages | Task 2 rewrite query JOIN games + teams |
| 2 | **CRITICAL** | Migrations 033~036 not applied + 033 broken | Task 1 migration 037 + Task 2 query rewrite + 사용자 push |
| 3 | HIGH | force-dynamic vs revalidate=1800 inconsistency | Task 2 안 revalidate=1800 정합 |
| 4 | HIGH | "박제 X" dev jargon user-visible | Task 2 안 "해당 일자 경기가 없습니다" 정합 |
| 5 | HIGH | assertSelectOk 부재 silent drift risk | Task 2/3 안 wrap 박제 |
| 6 | MEDIUM | Manual /en mirror drift | defer (autoplan 결정) |
| 7 | MEDIUM | generateStaticParams 누락 | Task 4 5팀 pre-render |
| 8 | MEDIUM | notFound regex weak (2099-99-99 accept) | Task 2 안 proper date parse |
| 9 | LOW | JSON-LD XSS | Task 4/5 JSON.stringify escape |
| 10 | LOW | Test mock false-success | Task 2/4/5 안 generated type 정합 |

**Eng recommendation**: REVISE — fix #1, #2, #3, #5 before Task 8~14 진입

---

## Phase 4 — Final Approval Gate (auto-approve, goal hook 추천방향대로)

### 결정 분류

**Mechanical (자동 결정)**:
- Codex skip (auth check unavailable, skip degradation)
- assertSelectOk wrap (KBO pattern 정합 — P5 explicit)
- ISR revalidate=1800 정합 (P5)
- 30팀 mapping + 5팀 pre-render + ISR fallback (P3 pragmatic + P1 completeness)

**Taste decisions (recommended path + 자동 적용)**:
- 영문 mirror 9 페이지 defer (P3 + P6 — measure 후 박제)
- Wild Card / Postseason defer (P3 시즌성)
- 30팀 vs 5팀 = 30팀 mapping + 5팀 pre-render (P1 boil lake)
- Manual /en mirror vs next-intl = 라이브러리 도입 X (P5 + 한국어 trafic uncertain)

**User Challenge (없음)** — CEO + Eng 양쪽 결정이 user 초기 Plan B 안 11 task scope 와 일치 X (둘 다 scope 축소 권장). 그러나 user goal hook 안 "추천방향대로" = 명시적 인준. User Challenge 차원 박제 → AUTO-APPROVE.

### 박제 Tasks aggregated

```
- [ ] Task 1 (P1, human: 5min / CC: 5min) — DB Migration — 037 fix predictions_league_date 인덱스
  - Surfaced by: eng-review CRITICAL #1/#2
  - Files: supabase/migrations/037_fix_predictions_index.sql

- [ ] Task 2 (P1, human: 0 / CC: 1h) — Tier A+B page query rewrite
  - Surfaced by: eng-review CRITICAL #1
  - Files: apps/moneyball/src/app/mlb/page.tsx, mlb/games/[date]/page.tsx, mlb/games/[date]/[slug]/page.tsx

- [ ] Task 3 (P2, human: 0 / CC: 1h) — prerequisite helper sprint
  - Surfaced by: ceo-review #3
  - Files: packages/shared/src/constants/mlb-teams.ts, apps/moneyball/src/lib/mlb/*.ts

- [ ] Task 4 (P2, human: 0 / CC: 45min) — /mlb/team/[code]
  - Surfaced by: original plan b
  - Files: apps/moneyball/src/app/mlb/team/[code]/page.tsx

- [ ] Task 5 (P2, human: 0 / CC: 45min) — /mlb/players/[id]
  - Surfaced by: original plan b
  - Files: apps/moneyball/src/app/mlb/players/[id]/page.tsx

- [ ] Task 6 (P3, human: 0 / CC: 30min) — /mlb/factors
  - Surfaced by: original plan b
  - Files: apps/moneyball/src/app/mlb/factors/page.tsx

- [ ] Task 7 (P3, human: 0 / CC: 30min) — /mlb/standings
  - Surfaced by: original plan b
  - Files: apps/moneyball/src/app/mlb/standings/page.tsx

- [ ] Task 8 (P3, human: 0 / CC: 15min) — hub WC/Postseason placeholder
  - Surfaced by: ceo-review #2
  - Files: apps/moneyball/src/app/mlb/page.tsx
```

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale |
|---|---|---|---|---|---|
| 1 | Phase 0 | Codex skip — claude subagent only | Mechanical | P6 | Codex `auth status` unavailable in CLI 0.120.0 |
| 2 | Phase 0 | Phase 2 Design skip | Mechanical | P3 | UI 패턴 박제 (KBO 정합 read 박제), 신규 design 결정 X |
| 3 | Phase 0 | Phase 3.5 DX skip | Mechanical | P3 | 내부 라우트 박제 — DX-facing 박제 X |
| 4 | Phase 1 | Scope reduction 11 → 6 task | Taste (CEO recommended) | P1+P2 | 6-month regret scenario 회피 + cohort evidence 부재 |
| 5 | Phase 1 | 영문 mirror defer | Taste (CEO #1) | P3 | EN cohort evidence X, drift risk |
| 6 | Phase 1 | Wild Card / Postseason defer | Taste (CEO #2) | P3 | 시즌 후반 한정 가치 |
| 7 | Phase 1 | 30팀 + 5팀 pre-render | Taste (CEO #5) | P1+P3 | boil lake 안 cost 동일 |
| 8 | Phase 3 | Critical bug fix (Task 1/2) priority | Mechanical | P5 | shipped 페이지 production-broken |
| 9 | Phase 3 | assertSelectOk wrap 강제 | Mechanical | P5 | KBO pattern 정합, silent drift 차단 |
| 10 | Phase 3 | prerequisite helper sprint 강제 (Task 3) | Mechanical | P5 | scope creep 차단, drift case 4 방지 |
| 11 | Phase 4 | AUTO-APPROVE | Mechanical (user goal hook) | P6 | "추천방향대로 완주" 명시 |

### Phase Outputs

- Phase 1 (CEO): ✅ 6 findings + scope reduction recommendation
- Phase 2 (Design): ⏭️ skipped (UI 패턴 박제)
- Phase 3 (Eng): ✅ 10 findings + 6-dimension score (4/10 architecture, 4/10 tests, 3/10 deployment)
- Phase 3.5 (DX): ⏭️ skipped (내부 라우트)
- Phase 4: ✅ AUTO-APPROVE (goal hook)

### Review Scores Summary

- CEO: 4 HIGH + 2 MEDIUM, scope reduction recommended
- Eng: **2 CRITICAL** + 3 HIGH + 4 MEDIUM + 1 LOW, REVISE before C+D 진입
- Design: skipped
- DX: skipped

### Cross-Phase Themes

**Theme: Schema/data layer drift** — CEO #3 (helper prerequisite gap) + Eng #1 (schema mismatch) + Eng #2 (migration unapplied) + Eng #5 (assertSelectOk missing) → 모두 같은 silent drift 가족. High-confidence signal — drift 사례 4/8/11 패턴 박제.

---

**autoplan STATUS**: DONE_WITH_CONCERNS

**Concerns**:
1. Phase 2 Design + Phase 3.5 DX skipped (autoplan condensed run)
2. Codex single-voice degradation (auth check unavailable)
3. Critical Bug A + B identified — production-broken state, immediate fix required before further MLB UI 박제

**Suggested next step**: develop-cycle Cycle 1024 fire — Task 1 + Task 2 priority (CRITICAL FIX) → Task 3 (prerequisite) → Task 4~8 (MVP)

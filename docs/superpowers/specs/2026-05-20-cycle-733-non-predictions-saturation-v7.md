# non-predictions 페이지 candidate audit — saturation v7

**Cycle**: 733 (2026-05-20)
**Chain**: explore-idea (lite, carry-over evidence + spec gap closure)
**Status**: spec 박제 — 후보 A (cycle 730~732 ship 완료) + 후보 B audit + 후보 C~D 인벤토리 박제. fire 대기 (carry-over)
**Parent**: `2026-05-19-cycle-719-non-predictions-saturation-v6.md` (2 ship + 2 reject — cycle 728 closure)

---

## 발화 맥락

- **saturation v6 closure 완료** (cycle 720~728): A (/analysis 이번 주 archive status filter, 720 PR #991) / B (/reviews/monthly teamStats sort, 721 PR #992) 2 ship + C (/reviews/monthly highlights chip) / D (/search dateHits sort) 2 reject. cycle 724 review-code heavy CLAUDE.md 2 컴포넌트 sync (PR #993). cycle 728 polish-ui lite token cohesion baseline retro-only (silent drift 0건).
- **v7 후보 A 즉흥 fire** (spec 부재 진행): cycle 730 audit PASS retro-only / cycle 731 fire ship (PR #994 LeaderboardSortControl 3-mode 정확도/연속/표본) / cycle 732 review-code heavy CLAUDE.md sync (PR #995). v7 spec gap = 본 사이클 closure.
- **2-chain alternation lock 무**: 직전 8 cycle (725-732) distinct = 6 (explore-idea 3 + 단발 5 chain) — lock 해당 X.
- **chain gap**: fix-incident=4 (cycle 729) / polish-ui=5 (cycle 728) / op-analysis=6 (cycle 727) / info-arch=7 (cycle 726) / explore-idea=2 (cycle 731) / review-code=1 (cycle 732). 주기 보정 trigger 미충족 (op-analysis 25 / fix-incident 20 / info-arch 30).
- **trigger 분류**: carry-over evidence (cycle 732 next_rec primary = "explore-idea (lite, saturation v7 후보 B audit 시작)") + v7 후보 A ship cohort 직후 + spec gap closure. improvement saturation 직전 15 cycle (718-732) = review-code 3 + fix-incident 2 + polish-ui 2 + info-arch 1 + op-analysis 1 + explore-idea 6 = 9/15 (12 미달, saturation chain trigger X — 단 carry-over evidence 강함).
- **lite cap 미발동**: explore-idea 직전 5 cycle (728-732) outcome distinct = success 3 + chain 변경 2. 5회 연속 retro-only X.
- **ship-0 emergency stop 미발동**: 직전 10 outcome (723-732) = success 10건.
- **mode 선택**: lite — v6 closure 후 자연 carry-over + spec 패턴 (cycle 698 v4 + cycle 711 v5 + cycle 719 v6) 3회 재사용 검증. spec write only, fire 다음 cycle carry-over.

## 비-/predictions 영역 v7 candidate inventory

v3~v6 ship 컴포넌트 누적 (saturation v3 3 ship + v4 3 ship + v5 4 ship + v6 2 ship + v7 후보 A 1 ship = 13 ship) + 신규 영역 list-host 페이지 재사용.

### list-host inventory (cycle 733 scan)

| 페이지 | line | 데이터 단위 | 현 filter / sort | chip candidate |
|---|---|---|---|---|
| /seasons/[year] 팀 순위 table | 304 — line 152-193 | team × 8 column (10팀) | ❌ (default = 승률 desc) | **B — teamStats sort chip** (승률 / 득실 / 표본) |
| /seasons/[year] 한국시리즈 게임 list | 304 — line 117-135 | game × N (4~7경기) | ❌ (시계 default) | reject — N 가변 + 시계 자연 |
| /seasons/[year] 인상적인 경기 grid | 304 — line 224-228 | ExtremeCard × 3 (각 N=5) | ❌ | reject — N=5 단위 + 카테고리 separated (sort 무의미) |
| /seasons/[year] 월별 평균 득점 | 304 — line 196-221 | month × 7 | ❌ (월 시계 default) | reject — 월 시계 자연 |
| /predictions/[date] 일자 detail 게임 list | 544 — line 398 | game × ~5/일 | ❌ (sortedGames map) | C — 일자 detail sort chip (신뢰도 / 시계 / 팀 가나다) |
| /players/[id] recent 출장 list | 272 — line 208 | appearance × N | ❌ (시계 default) | reject — 선수 페이지 traffic 낮음 + N 가변 |
| /dashboard chart-heavy | 284 | metric × N | ❌ | reject — list-host 패턴 X (chart 위주) |
| /home 메인 페이지 | 870 | predictions card × 5~10 | ❌ (FavoriteTeamFilter 박제 v0.5.18~21) | reject — 이미 chip 박제 + 다음 sweep target |
| /accuracy view mode | 979 | 캘리브레이션 / 트렌드 / 팀별 | ❌ | reject — 시각화 위주 (cycle 719 reject 유지) |

**핵심 후보 = B (`/seasons/[year]` 팀 순위 sort chip)**. C (`/predictions/[date]` 일자 detail sort chip) 는 N=5/일 소표본 + 일자 detail 자체가 default desc 자연 — ROI marginal.

## 신규 candidate 2건 (B~C)

### 후보 B — /seasons/[year] 팀 순위 table sort chip (승률 default / 득실 / 표본)

**chain**: explore-idea (lite)
**상태**: /seasons/[year] page.tsx line 152-193 — `summary.teams.map((t, idx))` 10팀 table. default = 승률 desc 자연 (server-side). 득실 (runDiff) / 표본 (games) 정렬 cohort 분리 부재.
**가치**: TeamAccuracySortControl (cycle 715 PR #989) / MonthlyTeamStatsSortControl (cycle 721 PR #992) 패턴 100% 재사용 — `/standings` → `/reviews/monthly` → `/seasons/[year]` sibling 3번째 cross-page. 시즌 detail 페이지 안 강자 비교 mental model 확장 (득실 = run differential 강자 / 표본 = 다음 시즌 비교 대비 base).
**ROI**: **high — B sibling pattern**. ~90 line + server precompute runDiffRankMap + gamesRankMap (IIFE) + inline order CSS 토글 (cycle 715 패턴). cohort N=10팀 ≥3 임계 통과.
**위험**: low~medium.
- /seasons/[year] = ISR cache (`stat -f %m apps/moneyball/src/app/seasons/[year]/page.tsx` 미체크 — 단 server-render 가정). cycle 715 standings 처럼 server→client 변환 X — 모든 row 동시 SSR + client CSS order 토글. ISR cache 영향 X.
- table row 가 `<tr>` 이라 flexbox order 직접 불가 — `<tbody>` order 적용 X. mitigation: `<tr>` 에 inline `style={{ order: rank }}` CSS 적용 시 `<tbody>` parent 가 `display: flex; flex-direction: column` 필요. 또는 server-side full sort 후 SSR (chip 토글 = client navigate?) — 단 client navigate X (cohort 패턴 = data-attr + CSS order).
- **alternative**: `<tbody>` 를 `display: contents; ... { display: flex }` 또는 row order = `<tr>` inline `style={{ display: 'table-row', order }}` — 단 table layout 깨질 위험.
- **safer alternative**: `<tbody>` 안 `<tr>` 대신 `<li>` 또는 `<div role="row">` semantic 변환 + flexbox 적용 (cycle 715 standings 가 이 패턴). table → list 변환 = column header alignment 재작업 필요. line +30~50.
- 가장 안전 mitigation = `<tbody>` 그대로 + chip mode 마다 server-side sort prop + client cache (URL query param? localStorage 만?). 또는 chip = server navigate (Next.js `searchParams`) — 단 cohort 패턴 위배.
- **권장 mitigation (fire 단계 결정)**: `<tbody>` `display: contents` 트릭 + `<tr>` `style={{ order }}` — Safari 비호환 가능성 있음. test 필요. fire 단계서 alternative 결정.
**fire trigger**: 본 후보 ranking 채택 시 (lite explore-idea 자연 fire 권장 1순위). 단 table layout mitigation 결정 후 fire — audit + design 별도 cycle 또는 fire 사이클 첫 step.

### 후보 C — /predictions/[date] 일자 detail 게임 카드 sort chip (신뢰도 / 시계 / 팀 가나다)

**chain**: explore-idea (lite)
**상태**: /predictions/[date] page.tsx line 398 — `sortedGames.map((game))` 일자별 5경기 카드 list. default = `sortedGames` (서버 sort 후 client 박제).
**가치**: PredictionsSortControl (cycle 637 PR — /predictions hub) sibling 확장 — 일자 detail page 안 sort cohort. 신뢰도 desc default → 시계 (게임 시간순) / 팀 가나다 cohort.
**ROI**: low~medium. base size N=5/일 소표본. 5경기 안 sort 가치 marginal (사용자가 한 눈에 보이는 size). cohort 차별 약함.
**위험**: low. ~80 line. 단 ROI 부족 — reject 후보 가까움.
**fire trigger**: 후보 B fire 후 가시 가치 평가 후 결정. 단독 fire 권장 X.

## reject 후보 사유

### D — /home 메인 페이지 chip 확장

**상태**: 이미 FavoriteTeamFilter (v0.5.18~21) 박제. 추가 chip = 정보 과부하 위험. 다음 sweep target 으로 보류.
**reject 이유**: 홈 페이지 = 첫 진입점 = chip 누적 시 cognitive load ↑. saturation v8+ 후속 sweep 또는 별도 IA review 차원에서 다룸.

### E — /players/[id] / /dashboard / /accuracy

**상태**: 시각화 또는 traffic 낮은 페이지. v6 reject 패턴 유지.
**reject 이유**: chip 매핑 ROI 부족.

## fire 순서 권장 (carry-over)

다음 cycle (734) = 후보 B fire 권장 (lite explore-idea). 단 table layout mitigation (`<tbody>` `display: contents` 트릭 또는 semantic 변환) 결정 = fire 사이클 첫 step.

cycle 735+ = 후보 B ship cohort silent drift sync (review-code heavy, CLAUDE.md 박제). 후보 C 단독 fire 권장 X.

## 검증 cohort

- cycle 731 LeaderboardSortControl 패턴 (3-mode = 정확도/연속/표본) 검증 evidence — 본 cycle 후보 B 도 3-mode 가능 (승률/득실/표본). 단 base default = 승률 자연 (체적 변경 X).
- saturation v3~v7 누적 ship = 13 컴포넌트 + 후보 B ship 시 14. 매 ship cohort = chip 패턴 안정화 evidence.
- carry-over 닫힘 = cycle 730/731/732 spec 부재 즉흥 진행 결함 closure. 본 spec 박제 = v3~v7 모두 spec → audit → fire → sync 4 step 패턴 100% 통일.

## 다음 cycle 후속 후보

- 후보 B fire (cycle 734 권장)
- 후보 B ship cohort silent drift family sync (cycle 735 권장, review-code heavy)
- 후보 C 단독 fire 평가 (cycle 736 옵션)
- saturation v8 inventory (홈 페이지 chip / IA 차원 / 새 영역) — 본 v7 closure 후 별도 spec

# non-predictions 페이지 candidate audit — saturation v3

**Cycle**: 679 (2026-05-19)
**Chain**: explore-idea (lite, improvement saturation trigger 8 = 14/15 ≥ 12 충족 + 2-chain alternation lock 발동 review-code+polish-ui 잠김)
**Status**: spec 박제 5/5 candidate audit — fire 대기 (carry-over)
**Parent**: `2026-05-19-cycle-649-predictions-direction-audit-v2.md` (5/5 후보 모두 ship 완료)

---

## 발화 맥락

- **cycle 649 spec 5/5 모두 fire 완료**: F (658) / I (660) / G (661) / J (이미 ship 박제) / H (670). cycle 668 ROI ranking stale 정정 + cycle 670 spec H heavy fire ship.
- **2-chain alternation lock 발동**: 직전 8 cycle distinct = 2 (review-code 6 + polish-ui 2). review-code + polish-ui 두 chain 모두 cooldown N=1 강제 제외.
- **improvement saturation 14/15**: 직전 15 cycle (664~678) saturation chains (review-code 10 + polish-ui 3 + fix-incident 1 + info-arch 0) = 14/15 ≥ 12. explore-idea trigger 8 자연 충족.
- **0회 발화 chain check** (직전 20 cycle): operational-analysis 0 (gap=22, ≥25 임계 미달) / info-arch 0 (gap=23, ≥30 임계 미달) / fix-incident 1 (gap=10, ≥20 임계 미달) — 모두 주기 보정 trigger 미충족. opt-out 7 chain 평가 제외.
- **lite cap 미발동** (직전 5 cycle explore-idea 0회).
- **ship-0 emergency stop 미발동** (직전 10 outcome 8 success / 1 partial / 1 success — partial cycle 676).
- **carry-over spec evidence X**: cycle 649 spec 5/5 ship 완료. 새 carry-over 0. heavy 모드 TODOS Next-Up 비어있음 (4주+ 미진행 후보 부재). lite 모드 + 새 spec 박제 자연.

## /predictions index 외 페이지 영역 현황 (cycle 678 기준)

| 페이지 | line | 데이터 단위 | filter chip | sort chip | search | 비고 |
|---|---|---|---|---|---|---|
| /accuracy | 979 | row (verified pred) | ❌ | ❌ | ❌ | confidenceTiers / weekly trend / 팀별 / scoring_rule 모두 server side 통계. chip 부재. |
| /leaderboard | 59 + LeaderboardClient | entry (user / ai) | weekly/season tab (useState session-only) | ❌ | ❌ | tab persistence 부재 — reload 시 weekly 강제 복귀. |
| /reviews | 249 (hub) | month/week hub | ❌ | ❌ | ❌ | hub page. monthly/weekly/misses 분리. |
| /reviews/monthly/[monthId] | (분리) | game (월) | ❌ | ❌ | ❌ | 월별 카드 list. 시간 정렬만. sort chip 부재. |
| /reviews/misses | 212 | game (failed) | ❌ | ❌ | ❌ | failed pick 분석. 확신도/차이 정렬 부재. |
| /analysis | 950 | game (yesterday) | ❌ | ❌ | ❌ | 어제 경기 결과 isCorrect 라벨만. status filter chip 부재. |
| /analysis/game/[id] | (분리) | game (단일) | N/A | N/A | N/A | 단일 게임 deep dive. filter 대상 X. |

**공통 부재 패턴**: /predictions index 영역에 박제된 5 filter 컴포넌트 패턴 (`useSyncExternalStore` + localStorage + chip group + 인라인 `<style>` `[data-*]` attr visibility 토글) = 다른 페이지 영역 0건 적용. saturation break 확장 영역.

## 신규 candidate 5건 (A~E)

각 후보 = 1 cycle 안 closure 가능 + ship PR 1 단위. /predictions 영역 5 컴포넌트 (Status/Sort/Tier/Month/SearchBox) 패턴 그대로 재사용 가능.

### 후보 A — /analysis (어제) 결과 status filter chip

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: /analysis 어제 경기 카드 list 안 isCorrect chip (적중/실패) 가시. 그러나 페이지 상단 filter chip 부재 — 사용자가 "적중 경기만 보고 싶다" 또는 "실패 경기만 보고 싶다" 시 scroll 필요.
**가치**: 사용자 cohort 선택. 적중/실패/pending 3 chip = 어제 경기 N=5~10건에서도 직관적 노출 비교.
**ROI**: high. /predictions PredictionsStatusFilter.tsx (99 line) 패턴 그대로. ~80 line + data-game-status attr 카드 토글. 데이터 가공 X.
**위험**: low. 어제 N=5~10건 = 카드 count 작아도 chip 가치 잔존 (cohort 비교 UX). chip count=0 시 disable (cycle 646 패턴).
**fire trigger**: 사용자 자연 발화 "어제 적중만 보고 싶다" / "결과 필터" 류, 또는 본 후보 ranking 채택 시.

### 후보 B — /reviews/monthly/[monthId] sort chip (최신 / 적중률 high / 적중률 low)

**chain**: explore-idea (lite)
**상태**: /reviews/monthly/[monthId] 월별 카드 list = 시간 정렬만. 적중률 비교 시 사용자가 카드 scroll 후 mental 합산 필요.
**가치**: 정보 정리. 월 안 적중 cohort 즉시 노출 (높은 적중률 게임 vs 낮은 적중률 게임 비교).
**ROI**: medium~high. PredictionsSortControl.tsx (84 line) 패턴 그대로. ~80 line + column-reverse 또는 carry-over 정렬 (game 안 is_correct + confidence). data attr.
**위험**: low. SSG 영향 X (client filter). sort label = "최신 / 적중 우수 / 미적중 우수" 3 chip.
**fire trigger**: 사용자 "월별 적중률 보고 싶다" 발화, 또는 본 후보 ranking 채택 시.

### 후보 C — /accuracy confidence tier filter chip (low / mid / high)

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: /accuracy 페이지 안 confidenceTiers 표 = server side 통계 row 분리. 그러나 weekly trend / 팀별 / scoring_rule 통계는 confidence 무관 mix. 사용자가 "high confidence cohort 만 weekly trend 보고 싶다" 시 분리 불가.
**가치**: cohort cross-section. confidence tier × 다른 통계 교차 노출.
**ROI**: medium. /accuracy 979 line server component 대대적 client 분리 필요 — chip 추가만으로 안 됨. data-confidence-tier attr 박제 + 통계 client side 재계산 부담. ~150 line + 페이지 구조 변경.
**위험**: medium. server side 통계가 chip selection 따라 재계산 필요 (client side 합산 또는 데이터 전체 client 전송). 페이지 크기 증가. /accuracy 가 무거운 페이지 (979 line) → 추가 부담 신중.
**fire trigger**: 사용자 "high confidence 만 보고 싶다" 발화, 또는 본 후보 ranking 채택 시. **신중**: ROI vs 위험 ≥ 1 검증 필요.

### 후보 D — /reviews/misses sort chip (확신도 desc / 최근 desc / 차이 큰 순)

**chain**: explore-idea (lite)
**상태**: /reviews/misses 페이지 = failed pick (예측 vs 실제 결과 미스) 분석. 정렬 부재 — 사용자가 "어떤 미스가 가장 큰가" 인지 시 scroll 필요.
**가치**: 실패 cohort 정렬. 모델 over-confidence 또는 모델 vs 실제 결과 차이가 큰 미스부터 노출.
**ROI**: medium. PredictionsSortControl.tsx 패턴 그대로. ~80 line + data-miss-* attr 정렬 key 박제.
**위험**: low. SSG 영향 X. /reviews/misses 페이지 N=20~30건 = 정렬 가치 ≥.
**fire trigger**: 사용자 "큰 미스 먼저 보고 싶다" 발화, 또는 본 후보 ranking 채택 시.

### 후보 E — /leaderboard tab persistence (useSyncExternalStore + localStorage)

**chain**: polish-ui (lite) 또는 explore-idea (lite)
**상태**: /leaderboard LeaderboardClient.tsx 안 `const [tab, setTab] = useState<Tab>('weekly')` = session-only. 페이지 reload 시 weekly 강제 복귀. 사용자가 season tab 선호 시 매 reload 시 클릭 필요.
**가치**: UX friction 제거. 사용자 선호 cohort 유지.
**ROI**: medium. useSyncExternalStore + localStorage `mb_leaderboard_tab_v1` 패턴 적용. ~30 line + useState → useSyncExternalStore 마이그레이션.
**위험**: low. SSR hydration 주의 (서버 렌더 시 default weekly + client mount 후 localStorage 읽기). 기존 페이지 동작 변경 minimal.
**fire trigger**: 사용자 "leaderboard tab 유지" 발화, 또는 본 후보 ranking 채택 시.

## ROI ranking + 차기 cycle 매핑

| 우선 | 후보 | 1순위 trigger | 적합 chain | 적합 mode | Fire 상태 |
|---|---|---|---|---|---|
| 1 | A /analysis status filter | 어제 cohort 선택 가치 high | explore-idea | lite (1 cycle) | 대기 |
| 2 | B /reviews/monthly sort | 월별 적중률 비교 가치 | explore-idea | lite (1 cycle) | 대기 |
| 3 | D /reviews/misses sort | 큰 미스 정렬 가치 | explore-idea | lite (1 cycle) | 대기 |
| 4 | E /leaderboard tab persistence | UX friction 작은 fix | polish-ui | lite (1 cycle) | 대기 |
| 5 | C /accuracy confidence tier | cohort cross-section | explore-idea | heavy (server→client refactor) | 신중 — ROI vs 위험 검증 필요 |

**자율 발화 정책**:
- 본 후보 5건 = saturation break 옵션 pool 갱신 (cycle 649 spec 5건 모두 fire 완료 → cycle 679 spec 5건 carry-over).
- 차기 cycle 진단 단계서 chain trigger 충족 + 본 후보 매핑 자연 시 자율 fire. 우선순위 A > B > D > E > C.
- 사용자 자연 발화 시 후보 무관 fire (사용자 신호 우선).
- 후보 C = ROI vs 위험 검증 필요. 차기 cycle 첫 fire 권장 X (A/B/D/E 4 후보 fire 완료 후 검증 후 결정).

## carry-over 안전망

- 본 spec 미처리 시 다음 explore-idea cycle 자동 input. 4주+ 미진행 시 archive (`~/.develop-cycle/plans/_archive/`).
- review-code/polish-ui 영역의 silent drift family streak 자연 잔존. saturation break 시 본 spec carry-over 우선 (직전 spec 의 fire 완료 후 자연 sweep 확장).
- /predictions filter 5 컴포넌트 패턴 = template. 본 spec 4 후보 (A/B/D/E) 모두 동일 pattern 재사용 = 빠른 closure 가능.

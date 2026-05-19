# non-predictions 페이지 candidate audit — saturation v4

**Cycle**: 698 (2026-05-19)
**Chain**: explore-idea (lite, improvement saturation trigger 8 = 12/15 ≥ 12 충족 자연)
**Status**: spec 박제 5/5 candidate audit — fire 대기 (carry-over)
**Parent**: `2026-05-19-cycle-679-non-predictions-saturation-v3.md` (4/5 ship + 1 carry-over heavy)

---

## 발화 맥락

- **saturation v3 처리 결과**: A (680) / E (681) / B-redirect (684) / D (685) 4건 ship 완료. C (/accuracy confidence tier heavy) carry-over 잔존 — `차기 cycle 첫 fire 권장 X` 명시 (ROI vs 위험 ≥ 1 검증 필요).
- **improvement saturation 12/15**: 직전 15 cycle (683~697) saturation chain (review-code 7 + fix-incident 1 + polish-ui 2 + info-arch 2) = 12/15 ≥ 12. explore-idea trigger 8 자연 충족.
- **2-chain alternation lock check**: 직전 8 cycle distinct = 4 (polish-ui/info-arch/op-analysis/review-code). lock 미발동.
- **0회 발화 chain check** (직전 20 cycle): fix-incident 1 (gap=9, ≥20 임계 미달) / op-analysis 2 (gap=3, ≥25 미달) / info-arch 2 (gap=2, ≥30 미달) / explore-idea 5 (gap=13, 본 cycle 자연 발화) — opt-out 6 chain 평가 제외.
- **lite cap 미발동** (직전 5 explore-idea = 0회. cycle 684/685 후 13 cycle gap).
- **ship-0 emergency stop 미발동** (직전 10 outcome = 모두 success).
- **carry-over spec evidence**: saturation v3 C 잔존 — 그러나 spec 자체가 "신중" + heavy refactor (979 line 페이지). 본 cycle 대신 v4 후보 4건 (A~D 신규) 신선 sweep + C 처리 결정 carry-over.

## 비-/predictions 영역 추가 candidate audit (cycle 697 기준)

cycle 679 spec audit 후 fire 완료 4건 + carry-over 1건. 이번 v4 spec = v3 carry-over 외 신규 4건 (다른 페이지 영역). /predictions filter 5 컴포넌트 패턴 = template, 다른 페이지 영역 재사용 가능.

| 페이지 | line | 데이터 단위 | 현 filter / sort | v4 candidate |
|---|---|---|---|---|
| /glossary | 467 | term × category | ❌ | A — 카테고리 chip filter |
| /reviews/weekly/[week] | 424 | game (주) | ❌ | B — sort chip (최신/적중률 high/low) |
| /teams/[code] | 404 | game (팀) | ❌ | C — 최근 game home/away/win/loss filter |
| /matchup/[teamA]/[teamB] | 383 | game (h2h) | ❌ | D — h2h game sort chip (최신/근접도) |
| /accuracy | 979 | row × tier | ❌ | E (v3 carry-over) — confidence tier filter heavy |

## 신규 candidate 4건 (A~D) + carry-over (E)

각 candidate = 1 cycle 안 closure 가능 (E 제외). /predictions filter 컴포넌트 패턴 그대로 재사용.

### 후보 A — /glossary 카테고리 chip filter

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: /glossary 467 line — 25 term × 6 카테고리 (타격 / 투수 / 팀 / 검증·평가 / 기타). 페이지 진입 시 전체 scroll, 카테고리별 분리 진입 path 부재.
**가치**: term 25 → 카테고리별 cohort 노출. SEO 영향 X (server render 그대로 + client visibility 토글). 사용자가 "투수 지표만" / "검증 지표만" cohort 진입 가능.
**ROI**: high. PredictionsTierFilter.tsx (102 line) 패턴 그대로. ~100 line + data-glossary-category attr 카드 토글. 데이터 가공 X.
**위험**: low. category 6개 chip 만 출력 시 mobile 가로 scroll OK (PredictionsMonthFilter 패턴). 'all' 외 chip count=0 disabled (cycle 646 패턴).
**fire trigger**: 사용자 자연 발화 "용어 카테고리" / "투수 지표만" 류, 또는 본 후보 ranking 채택 시.

### 후보 B — /reviews/weekly/[week] sort chip (최신 / 적중률 high / low)

**chain**: explore-idea (lite)
**상태**: /reviews/weekly/[week] 424 line — 주별 게임 list 시간 정렬만. 적중률 비교 시 사용자 mental 합산 필요.
**가치**: 정보 정리. 주 안 적중 cohort 즉시 노출. saturation v3 B-redirect (/reviews hub) 와 sibling — weekly 분리 view 정렬.
**ROI**: medium~high. PredictionsSortControl.tsx (84 line) 패턴 그대로. ~80 line + column-reverse 또는 carry-over 정렬 (game 안 is_correct + confidence). data attr.
**위험**: low. SSG 영향 X (client filter). sort label = "최신 / 적중 우수 / 미적중 우수" 3 chip.
**fire trigger**: 사용자 "주별 적중률 보고 싶다" 발화, 또는 본 후보 ranking 채택 시.

### 후보 C — /teams/[code] 최근 game home/away/win/loss filter

**chain**: explore-idea (lite)
**상태**: /teams/[code] 404 line — 팀별 페이지에 recent form / Elo trend / 최근 게임 list. 게임 list 안 home/away 또는 win/loss 분리 cohort 부재.
**가치**: 팀 분석 cohort 세분화. "원정 폼만" / "최근 승리 경기만" 분리 노출.
**ROI**: medium. PredictionsStatusFilter.tsx 패턴 그대로. ~90 line + data-team-game-* attr 카드 토글.
**위험**: low. recent form 의 base size (N=10) 작아 chip cohort 더 작아질 위험 — 'all' 외 chip count=0 disabled gate (cycle 646 패턴) + count badge 명시.
**fire trigger**: 사용자 "팀 원정 폼만" / "팀 홈 폼만" 발화, 또는 본 후보 ranking 채택 시.

### 후보 D — /matchup/[teamA]/[teamB] h2h game sort chip (최신 / 근접도 high)

**chain**: explore-idea (lite)
**상태**: /matchup/[teamA]/[teamB] 383 line — 두 팀 head-to-head 페이지. h2h 게임 list 시간 정렬만. "접전 경기만" 또는 "큰 차이 경기만" 분리 부재.
**가치**: h2h cohort 정렬. 박빙 경기 우선 노출 (rivalry 가치 향상). saturation v3 D (/reviews/misses sort) 와 sibling pattern.
**ROI**: medium. PredictionsSortControl.tsx 패턴 그대로. ~80 line + 근접도 = |score_home - score_away| ascending sort key.
**위험**: low. 근접도 sort 시 0차이 (연장 무승부) 우선 노출 — KBO 무승부 없음 (12회 무승부 제외 시 0차이 N=0). 1차이 이하 cohort 가시 가치.
**fire trigger**: 사용자 "접전 경기만" / "박빙 매치업" 발화, 또는 본 후보 ranking 채택 시.

### 후보 E (v3 carry-over) — /accuracy confidence tier filter chip

**chain**: explore-idea (heavy)
**상태**: saturation v3 carry-over. /accuracy 979 line — confidenceTiers / weekly trend / 팀별 / scoring_rule 4 통계 server side. tier × 다른 통계 교차 노출 부재.
**가치**: cohort cross-section. "high confidence cohort 만 weekly trend" 노출.
**ROI**: medium. server→client 분리 필요 (~150 line + 페이지 구조 변경). v3 spec 의 "신중 — ROI vs 위험 검증" 잔존.
**위험**: medium. /accuracy 가장 큰 페이지 (979 line). 추가 부담 검증 필요.
**fire trigger**: A~D 4 후보 fire 완료 후 검증 → ROI 결정. 단독 fire 권장 X.

## ROI ranking + 차기 cycle 매핑

| 우선 | 후보 | 1순위 trigger | 적합 chain | 적합 mode | Fire 상태 |
|---|---|---|---|---|---|
| 1 | A /glossary 카테고리 chip | term 25 / 카테고리 6 cohort 노출 | explore-idea | lite (1 cycle) | 대기 |
| 2 | D /matchup h2h sort | 박빙 매치업 가치 high | explore-idea | lite (1 cycle) | 대기 |
| 3 | B /reviews/weekly sort | 주별 적중률 비교 | explore-idea | lite (1 cycle) | 대기 |
| 4 | C /teams/[code] game filter | 팀 cohort 세분화 | explore-idea | lite (1 cycle) | 대기 |
| 5 | E (v3 carry-over) /accuracy tier | ROI vs 위험 검증 | explore-idea | heavy | 신중 — A~D 후 검증 |

**자율 발화 정책**:
- 본 후보 4건 신규 (A~D) + 1건 v3 carry-over (E) = saturation break 옵션 pool 갱신.
- 차기 cycle 진단 단계서 chain trigger 충족 + 본 후보 매핑 자연 시 자율 fire. 우선순위 A > D > B > C > E.
- 사용자 자연 발화 시 후보 무관 fire (사용자 신호 우선).
- E = ROI vs 위험 검증 필요. 차기 cycle 첫 fire 권장 X (A~D 4 후보 fire 완료 후 검증 후 결정).

## carry-over 안전망

- 본 spec 미처리 시 다음 explore-idea cycle 자동 input. 4주+ 미진행 시 archive (`~/.develop-cycle/plans/_archive/`).
- /predictions filter 5 컴포넌트 패턴 = template. 본 spec 4 후보 (A/B/C/D) 모두 동일 pattern 재사용 = 빠른 closure 가능.
- E carry-over 누적 2회 (v3 + v4) — 다음 explore-idea fire 시 명시적 kill 또는 lite 분리 (server stats 4개 중 1개만 chip) 재 audit.

## 다음 cycle 후속 후보

- A fire: PredictionsTierFilter 패턴 ~100 line + data-glossary-category attr 박제 + chip count badge.
- D fire: PredictionsSortControl 패턴 ~80 line + score 차이 sort key 추가.
- B fire: 동일 sort 패턴 (cycle 685 misses sort 와 거의 동일).
- C fire: PredictionsStatusFilter 패턴 ~90 line + 2 group chip (home/away + win/loss).
- E fire 신중: lite refactor 분리 가능성 검토 (4 stats 중 confidenceTiers 자체 chip 만 → ~80 line lite 가능).

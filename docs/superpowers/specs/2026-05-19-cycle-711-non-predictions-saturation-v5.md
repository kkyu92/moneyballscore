# non-predictions 페이지 candidate audit — saturation v5

**Cycle**: 711 (2026-05-19)
**Chain**: explore-idea (lite, carry-over evidence trigger — cycle 710 saturation v5 후보 batch 식별 next_rec primary)
**Status**: spec 박제 5/5 candidate audit — fire 대기 (carry-over)
**Parent**: `2026-05-19-cycle-698-non-predictions-saturation-v4.md` (4/5 ship + 1 reject — cycle 708)

---

## 발화 맥락

- **saturation v4 처리 결과** (cycle 699~708): A (/glossary 카테고리, 699 PR #978) / B (/reviews/weekly sort, 703 PR #982) / C (/teams 최근 game filter, 704 PR #983) / D (/matchup 접전 filter, 700 PR #979) 4 ship + E (/accuracy tier filter) carry-over → cycle 708 audit 후 **reject** (ConfidenceTier 단일 섹션 비교 카드 구조 = card list filtering 패턴 매핑 X). saturation v4 batch 정식 close.
- **cycle 710 baseline 식별**: review-code (lite, silent drift family scan) → 잔여 cite=0 컴포넌트 10+ 발견 (MyPicksClient 392 / PredictionCard 328 / BigMatchDebateCard 211 등 picks/analysis family). saturation v5 후보 batch + next_rec primary "explore-idea (heavy/lite, saturation v5 첫 fire — picks family 추천)".
- **trigger 분류**: carry-over evidence (cycle 710 next_rec + 10+ 컴포넌트 식별 박제) + saturation v4 batch closure (cycle 708) 직후. improvement saturation 12/15 미충족 (last 15 cycle 696-710: review-code 2 + fix-incident 1 + polish-ui 2 + info-arch 2 = 7) — 본 trigger source X.
- **2-chain alternation lock check**: 직전 8 cycle (703-710) distinct = 8 (explore-idea/explore-idea/review-code/polish-ui/op-analysis/explore-idea/info-arch/review-code) — distinct=5. lock 미발동.
- **lite cap 미발동**: 직전 5 explore-idea (cycle 706-710) = 1회 (cycle 708 success). 5회 연속 retro-only X.
- **ship-0 emergency stop 미발동**: 직전 10 outcome (701-710) = success 9 + interrupted 1.
- **mode 선택**: lite — carry-over evidence 명확 (cycle 710 식별 candidates + cycle 698 v4 spec 패턴 재사용). cycle 698 v4 spec 패턴 = "spec write only, fire 다음 cycle carry-over". heavy 모드는 첫 candidate (A — /picks status filter) 직접 fire 까지 가능하나 spec audit 박제 + fire 분리가 ROI ranking 결정 가시화 +1.

## 비-/predictions 영역 추가 candidate audit (cycle 710 baseline 기준)

cycle 710 silent drift scan 결과 식별된 10+ cite=0 컴포넌트 중 "list-host + filter/sort chip 패턴 매핑 가능" 교집합 추출. /predictions filter 5 컴포넌트 + saturation v3+v4 chip 컴포넌트 12개 = 패턴 template, 신규 영역 재사용.

### list-host 페이지 inventory (cycle 711 scan)

| 페이지 | line | 데이터 단위 | 현 filter / sort | chip candidate |
|---|---|---|---|---|
| /picks | 22 (page) / 392 (MyPicksClient) | pick × game (사용자 이력) | ❌ | **A — status filter + B — sort chip** (2 분리) |
| /picks WeeklyHistorySection | 109 | week group | 아코디언만 | C — 주간 sort chip (최신 / 오래된) |
| /standings | 247 | team × accuracy (라벨 2개 list) | ❌ | D — teamAccuracy sort chip (적중률 / 표본 / Brier) |
| /seasons | 113 | season (연도) | ❌ | E — season sort chip (최신 / 오래된) |
| /players | 252 | pitcher + batter (top 10/20) | ❌ | F (reject 사유 명시) — leaderboard 이미 정렬 |
| /teams (hub) | 71 | TEAM_ORDER 10개 | ❌ | G (reject 사유 명시) — N=10 chip 가치 X |
| /matchup hub | 122 | TEAM × TEAM grid | ❌ | H (reject 사유 명시) — grid structure chip 매핑 X |

5 candidate (A~E) + 3 reject (F~H) 사유 명시.

## 신규 candidate 5건 (A~E)

각 candidate = 1 cycle 안 closure 가능. /predictions + saturation v4 filter 컴포넌트 패턴 그대로 재사용.

### 후보 A — /picks MyPicksClient 픽 이력 status filter chip (적중 / 실패 / 대기)

**chain**: explore-idea (lite)
**상태**: /picks MyPicksClient.tsx 392 line — 사용자 픽 이력 list (line 381 `entries.map`). 픽 상태 (적중 / 실패 / 결과 대기) cohort 분리 부재. 사용자가 자기 폼 review 시 mental 합산 필요.
**가치**: 사용자 자기 폼 분석 cohort 즉시 노출. PredictionsStatusFilter.tsx (103 line) 패턴 가장 가까움 — pick.is_correct === true / false / null 3 cohort.
**ROI**: **high — 최강**. cite=0 컴포넌트 saturation 첫 closure + PredictionsStatusFilter / ReviewsResultFilter / YesterdayStatusFilter 3중 패턴 검증된 template. ~100 line + data-pick-status attr.
**위험**: low. SSR 영향 X (client-only — MyPicksClient 이미 `'use client'`). pick base size 작을 가능성 — 'all' 외 chip count=0 disabled (cycle 646 패턴). 닉네임 안 등록 사용자도 같은 list 노출 (localStorage 기반).
**fire trigger**: 본 후보 ranking 채택 시 (lite explore-idea 자연 fire 권장 1순위).

### 후보 B — /picks MyPicksClient 픽 이력 sort chip (최신 / 오래된)

**chain**: explore-idea (lite)
**상태**: /picks MyPicksClient.tsx pick 이력 list 시간 정렬 (최신 default) 만. PickRow 카드 정렬 토글 부재. 사용자가 첫 픽부터 review 하고 싶을 때 mental 역순 합산 필요.
**가치**: 정보 정리. PredictionsSortControl / MissesSortControl / WeeklyGamesSortControl 3중 패턴 검증. A 와 composable (status filter + sort 동시 적용).
**ROI**: **high — A 와 sibling**. ~80 line + column-reverse 또는 carry-over 정렬. A 와 같은 컴포넌트 (MyPicksClient) 안 2 chip group 동시 ship — wire 자연.
**위험**: low. SSR 영향 X. A 와 fire 순서 = A 먼저 (status) → B 추가 (sort) 분리 권장 (R5 cycle 별 1 chain 1 closure 패턴 — diff size 작게 유지).
**fire trigger**: A 후속 ship (cycle 712 또는 713) 자연 sibling.

### 후보 C — /picks WeeklyHistorySection 주간 sort chip (최신 / 오래된)

**chain**: explore-idea (lite)
**상태**: /picks WeeklyHistorySection.tsx 109 line — 지난 주 기록 아코디언. 주차 그룹 시간 정렬 (최신 default) 만. 사용자가 시즌 시작부터 시간순 review 부재.
**가치**: 주차 history 정렬 토글. WeeklyGamesSortControl 패턴 재사용. A/B 와 sibling 컴포넌트 — picks 페이지 안 3 chip 일관성.
**ROI**: medium. ~80 line. base size 작음 (현재 weeklyGroups.length > 1 조건 = 최소 2 주). chip cohort 무의미할 수 있음 — N≥3 조건 추가.
**위험**: low~medium. WeeklyHistorySection 자체가 아코디언이라 chip 추가 시 visual stack ↑ — picks 페이지 cluttering 위험. 본 후보 fire 시 A/B 후 사용자 가시 평가 후 결정.
**fire trigger**: A + B ship 후 picks 페이지 visual density 확인 후 결정. 단독 fire 권장 X.

### 후보 D — /standings teamAccuracy sort chip (적중률 / 표본 / Brier)

**chain**: explore-idea (lite)
**상태**: /standings 247 line — 팀별 standings + teamAccuracy 2 list (server-render). teamAccuracy default 정렬 (적중률 desc 추정). 다른 정렬 cohort (표본 N / Brier) 분리 부재.
**가치**: 모델 분석 사용자 cohort. 표본 큰 팀 우선 vs Brier 낮은 팀 우선 정렬 토글.
**ROI**: medium. ~90 line. PredictionsSortControl 패턴 재사용. 단 server-render list 안 sort 시 server→client 변환 필요 — 또는 SortControl 이 inline style `[data-team-accuracy-row]` order 토글로 client filter only.
**위험**: medium. server→client 변환 = SSR 영향 +. inline order 토글로 회피 가능하나 N=10 cohort 정렬 가시 가치 검증 필요.
**fire trigger**: A~C 후보 ship 후 standings 가시 가치 confirm. 단독 fire 신중 권장.

### 후보 E — /seasons season sort chip (최신 / 오래된)

**chain**: explore-idea (lite)
**상태**: /seasons 113 line — SEASONS list (line 77 `SEASONS.map`). 시즌 정렬 (최신 default) 만. 사용자가 과거→현재 시간순 review 부재.
**가치**: 시즌 정렬 토글. 가장 trivial spec — SortControl 직접 재사용.
**ROI**: low. N=현재 1~2 시즌 (2025/2026). chip cohort 가치 N≥3 임계 미달. SortControl ship 자체 가능하나 사용자 가치 X.
**위험**: low. 작은 변경. 그러나 ROI 부족 — fire 권장 X (reject 후보 가까움).
**fire trigger**: ROI 재평가 후 결정. N≥3 시즌 도달 (2027 시즌 시작) 후 fire 자연.

## reject 후보 사유 (F~H)

### F — /players pitcher/batter sort chip

**reject 사유**: /players 252 line — pitcher (top N) + batter (top N) 이미 server-render top leaderboard. 정렬 stat (FIP/wOBA 등) 변경 필요 = server prop / URL query 변경 = client filter chip 패턴 매핑 X.
**대안**: SSG 영향 — /players?sort=FIP 등 URL 쿼리 라우팅. saturation v5 scope 외.

### G — /teams (hub) team filter chip

**reject 사유**: /teams 71 line — TEAM_ORDER 10팀 모두 동일 hub 노출. chip filter cohort (예: division / 지역) 매핑 가치 X — KBO 10팀은 division 분리 무의미 (단일 리그).
**대안**: 사용자가 자기 favorite 팀 빠른 진입 = FavoriteTeamFilter (이미 home 페이지 박제). /teams hub 자체 chip 부적합.

### H — /matchup hub h2h pair chip

**reject 사유**: /matchup 122 line — TEAM × TEAM grid (10×10 = 45 pair). grid structure chip 매핑 X. 사용자가 click 으로 pair 선택 = grid 자체가 selection mechanism.
**대안**: grid 안 row/column hover/highlight UX 별도 (chip 영역 아님).

## ROI ranking

**A > B > C > D > E** (heavy > medium > low 분리 명확).

- **첫 fire 권장**: A (/picks status filter) — saturation v4 후속 자연 + cite=0 컴포넌트 saturation 첫 closure + PredictionsStatusFilter 3중 검증 패턴 + 사용자 가시 가치 명확.
- **두 번째 fire 권장**: B (/picks sort chip) — A 와 sibling, MyPicksClient 안 2 chip group 일관성.
- **세 번째 fire 신중**: C (/picks WeeklyHistorySection sort) — A/B 후 visual density 확인 후 결정.
- **네 번째 fire 신중**: D (/standings teamAccuracy sort) — server→client 변환 검증 필요.
- **다섯 번째 fire 보류**: E (/seasons sort) — ROI 부족, N≥3 임계 미달.

## 본 spec 자체 박제 outcome

- **outcome**: partial — spec 박제만, code 변경 X. ship X.
- **carry-over**: A~D 4 후보 fire 대기 (다음 4 cycle 안 자연 발화). E carry-over reject 후보 (N=3 시즌 도달 후 재평가).
- **다음 cycle 1순위 권장**: A fire (PR #N — saturation v5 1/4 처리 시작).

## 박제 trail

- cycle 698: v4 spec 박제 (4 candidate + 1 carry-over)
- cycle 699: A (/glossary) ship — PR #978
- cycle 700: D (/matchup) ship — PR #979
- cycle 703: B (/reviews/weekly) ship — PR #982
- cycle 704: C (/teams) ship — PR #983
- cycle 708: E (/accuracy) audit → reject
- cycle 710: review-code lite baseline — saturation v5 후보 batch 식별 (next_rec primary)
- cycle 711: **현재** — v5 spec 박제 (A~E 5 candidate audit + F~H 3 reject 사유)
- cycle 712~: A 자연 fire 시작

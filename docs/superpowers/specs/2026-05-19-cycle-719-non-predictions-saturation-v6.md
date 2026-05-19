# non-predictions 페이지 candidate audit — saturation v6

**Cycle**: 719 (2026-05-19)
**Chain**: explore-idea (lite, carry-over evidence trigger — cycle 716 v5 5/5 closure + cycle 717 sync + cycle 718 token cohesion baseline)
**Status**: spec 박제 4/4 candidate audit — fire 대기 (carry-over)
**Parent**: `2026-05-19-cycle-711-non-predictions-saturation-v5.md` (4 ship + 1 reject — cycle 716 closure)

---

## 발화 맥락

- **saturation v5 closure 완료** (cycle 712~716): A (/picks PicksStatusFilter, 712 PR #986) / B (/picks PicksSortControl, 713 PR #987) / C (/picks WeeklyHistorySortControl, 714 PR #988) / D (/standings TeamAccuracySortControl, 715 PR #989) 4 ship + E (/seasons sort) reject (N=2 시즌 미달). cycle 717 review-code heavy CLAUDE.md 4 컴포넌트 sync (PR #990). cycle 718 polish-ui lite token cohesion baseline retro-only (silent drift 0건).
- **2-chain alternation lock 해제**: 직전 8 cycle (711-718) distinct = 3 (explore-idea 6 + review-code 1 + polish-ui 1) — cycle 718 polish-ui 추가로 cooldown N=1 만료.
- **chain gap**: fix-incident=17 (보정 3 잔여) / polish-ui=1 (스킵) / op-analysis=12 / info-arch=10 / explore-idea=3 / review-code=2.
- **trigger 분류**: carry-over evidence (cycle 718 next_rec primary = "explore-idea (lite, saturation v6 batch spec)") + v5 closure cohort 직후 + 2-chain LOCK 해제. improvement saturation 6/15 미충족 (last 15 cycle 704-718) — 본 trigger source X.
- **lite cap 미발동**: explore-idea 직전 5 cycle (714-718) outcome = success 3 + 2 chain 변경 — 5회 연속 retro-only X.
- **ship-0 emergency stop 미발동**: 직전 10 outcome (709-718) = success 10건 (cycle 651-700 92% rate 유지).
- **mode 선택**: lite — v5 closure 후 자연 carry-over + spec 패턴 (cycle 698 v4 + cycle 711 v5) 2회 재사용 검증. spec write only, fire 다음 cycle carry-over.

## 비-/predictions 영역 v6 candidate audit

v5 ship 컴포넌트 (PicksStatusFilter / PicksSortControl / WeeklyHistorySortControl / TeamAccuracySortControl) + saturation v3+v4 chip 컴포넌트 = 16+ 컴포넌트 검증 template. 신규 영역 list-host 페이지 재사용.

### list-host inventory (cycle 719 scan)

| 페이지 | line | 데이터 단위 | 현 filter / sort | chip candidate |
|---|---|---|---|---|
| /analysis 이번 주 archive section | 961 (page) — line 653-726 section | game × 일자 그룹 (월~어제) | ❌ (yesterday section 만 cycle 680 status filter) | **A — this-week-archive status filter chip** |
| /reviews/monthly/[month] teamStats | 370 — line 244 | team × 적중률 (10팀) | ❌ (default desc 추정) | **B — teamStats sort chip** (적중률 / 표본) |
| /reviews/monthly/[month] highlights | 370 — line 231 | WeeklyHighlight × 6~? | ❌ | **C — highlights sort chip** (적중 / 실패 / 시간) |
| /search dateHits | 290 — line 244 | date × N | ❌ (default desc) | D — date sort chip (최신 / 오래된) |
| /seasons | 113 | season 2 | ❌ | reject — N=2 미달 (v5 carry-over reject 유지) |
| /accuracy view mode | 979 | 캘리브레이션 / 트렌드 / 팀별 | ❌ | reject — chip 매핑 X (시각화 위주) |

4 candidate (A~D) + 2 reject 사유 유지.

## 신규 candidate 4건 (A~D)

각 candidate = 1 cycle 안 closure 가능. saturation v3~v5 chip 컴포넌트 패턴 그대로 재사용.

### 후보 A — /analysis 이번 주 경기 archive section status filter chip (적중 / 실패 / 미결)

**chain**: explore-idea (lite)
**상태**: /analysis page.tsx line 653-726 — `thisWeekPreviousGames` 일자별 그룹 + game card. status (적중 / 실패 / 미결) cohort 분리 부재. base size = 이번 주 월요일 ~ 어제 = 6~7 일 누적 게임 (cycle 718 시점 5/13~5/18 6일 = 약 25~30 게임 — 어제 only 5경기보다 5~6배).
**가치**: YesterdayStatusFilter (cycle 680 PR #969) 패턴 100% 재사용 + 같은 /analysis 페이지 안 sibling = mental model 정합. 사용자 이번 주 누적 적중/실패 cohort 즉시 노출.
**ROI**: **highest**. ~105 line + `data-this-week-status` attr. cycle 680 패턴 검증된 template. base size ≥ 25 = 'all' 외 chip count 비-zero 확률 매우 높음 (disabled UX 거의 발생 X).
**위험**: low. SSR 영향 X (client-only filter). yesterday section + this-week section 동시 chip 존재 → naming 충돌 회피 (localStorage key `mb_analysis_thisweek_status_v1`). 단 일자별 그룹 안 status 분포 다양 — 일자 헤더 잔존 시 시각 어색 (모든 게임 적중 일 chip 활성 시 일자 헤더만 노출). mitigation: 같은 일자 group 안 모든 게임 hidden 시 일자 헤더도 숨김 (selector 추가).
**fire trigger**: 본 후보 ranking 채택 시 (lite explore-idea 자연 fire 권장 1순위).

### 후보 B — /reviews/monthly/[month] teamStats sort chip (적중률 / 표본 / 가나다)

**chain**: explore-idea (lite)
**상태**: /reviews/monthly/[month] line 244 — `review.teamStats.map` 10팀 적중률 list. default 정렬 (적중률 desc 추정). 표본 N / 가나다 정렬 cohort 분리 부재.
**가치**: TeamAccuracySortControl (cycle 715 PR #989) 패턴 100% 재사용 — /standings → /reviews/monthly sibling. 표본 큰 팀 우선 cohort (smallSample title 무관 정렬 노출) + 가나다 (TEAM_ORDER 외) 정렬.
**ROI**: **high — B sibling pattern**. ~95 line + server precompute rank map (IIFE) + inline order CSS 토글 (cycle 715 패턴). cohort N=10팀 ≥3 임계 통과.
**위험**: low~medium. /reviews/monthly/[month] = server-render page (`revalidate = 3600`). cycle 715 standings 처럼 server→client 변환 X — 모든 row 동시 SSR + client CSS order 토글. ISR cache 영향 X.
**fire trigger**: A 후속 (cycle 720 또는 721) 자연 sibling. /standings → /reviews/monthly cross-page pattern 정합 evidence 박제.

### 후보 C — /reviews/monthly/[month] highlights sort chip (적중 / 실패 / 시간)

**chain**: explore-idea (lite)
**상태**: /reviews/monthly/[month] line 231 — `review.highlights.map` WeeklyHighlight grid (3 col). 시간/가치 순 default. 적중/실패 status filter 부재.
**가치**: ReviewsResultFilter (cycle 684 PR #972) + MissesSortControl (cycle 685 PR #973) 결합 패턴. highlight = "가장 가치 있던 N개" cohort 분리.
**ROI**: medium. ~100 line. base size 작음 (월간 highlights 통상 6~12개). cohort 0건 ('all' 외 disabled) 확률 medium.
**위험**: low~medium. /reviews/monthly/[month] cohort 표본이 작아 'all' 외 chip count=0 disabled UX 빈도 ↑. base size = 월별 highlights — N 충분 확인 후 fire 결정.
**fire trigger**: A + B ship 후 가시 가치 평가 후 결정. 단독 fire 신중 권장.

### 후보 D — /search 결과 dateHits date sort chip (최신 / 오래된)

**chain**: explore-idea (lite)
**상태**: /search page line 244 — `dateHits.slice(0, 15)` 일자 list. default desc 정렬. 시간 역순 cohort 부재.
**가치**: 사용자 검색 결과 시간순 review. PredictionsSortControl 패턴 재사용.
**ROI**: low. base size = 15 (slice 제한). 사용자 검색 결과 = 통상 적음 (cohort 사용성 제한). 검색 결과는 일반적으로 최신 desc 가 자연 — sort chip 가치 marginal.
**위험**: low. ~80 line. 그러나 ROI 부족 — reject 후보 가까움.
**fire trigger**: A~C 후보 fire 후 ROI 재평가. 단독 fire 권장 X.

## reject 후보 사유

### E — /seasons sort chip

**reject 사유**: v5 carry-over reject 유지. N=2 시즌 (2025/2026) — N≥3 임계 미달.
**대안**: 2027 시즌 시작 시 fire 재평가.

### F — /accuracy view mode toggle

**reject 사유**: /accuracy 979 line — 캘리브레이션 SVG / 주별 트렌드 / 팀별 성과 = 시각화 위주 페이지. chip filter 패턴 매핑 X (list-host 구조 X).
**대안**: 별도 page 내 tab persistence (cycle 681 LeaderboardClient 패턴) 가능 — 향후 별도 spec.

## ROI ranking

**A > B > C > D** (highest > high > medium > low).

- **첫 fire 권장**: A (/analysis 이번 주 archive status filter) — YesterdayStatusFilter 패턴 100% + 같은 페이지 sibling + base size ≥ 25 (cohort 풍부).
- **두 번째 fire 권장**: B (/reviews/monthly teamStats sort) — TeamAccuracySortControl 패턴 100% + 표본 N=10 ≥3 임계.
- **세 번째 fire 신중**: C (/reviews/monthly highlights sort) — base size 작음. cohort N 확인 후 결정.
- **네 번째 fire 보류**: D (/search date sort) — base size 15 slice 제한. ROI marginal.

## 본 spec 자체 박제 outcome

- **outcome**: success retro-only — spec 박제 + 사용자 review 대기. code 변경 X. ship X.
- **carry-over**: A~C 3 후보 fire 대기 (다음 3 cycle 안 자연 발화). D carry-over 신중 (ROI 재평가).
- **다음 cycle 1순위 권장**: A fire (/analysis 이번 주 archive status filter — saturation v6 1/4 처리 시작).

## 박제 trail

- cycle 698: v4 spec (4 candidate + 1 carry-over)
- cycle 699~704: v4 4 ship (PR #978, #979, #982, #983)
- cycle 708: v4 5번째 reject (/accuracy)
- cycle 711: v5 spec (5 candidate + 3 reject)
- cycle 712~715: v5 4 ship (PR #986, #987, #988, #989)
- cycle 716: v5 5번째 reject (/seasons) — v5 5/5 closure
- cycle 717: review-code heavy CLAUDE.md sync (PR #990)
- cycle 718: polish-ui lite token cohesion baseline retro-only
- cycle 719: **현재** — v6 spec 박제 (A~D 4 candidate + 2 reject)
- cycle 720~: A 자연 fire 시작

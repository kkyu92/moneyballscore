# /predictions 7~11번째 candidate audit — saturation v2

**Cycle**: 649 (2026-05-19)
**Chain**: explore-idea (lite, improvement saturation trigger 7 = 13/15 ≥ 12 충족)
**Status**: spec 5/5 후보 fire 완료 — F (cycle 658) / I (cycle 660) / G (cycle 661) / J (다른 cycle ship 완료) / **H (cycle 670 ship PR #959)**. cycle 668 review-code (lite, heavy 모드) 에서 stale claim 정정. cycle 671 review-code (lite, heavy 모드) 에서 H fire 완료 박제 동기.
**Parent**: `2026-05-19-cycle-623-saturation-direction-audit.md`

---

## 발화 맥락

- **cycle 623 spec 5 candidates 全 fire 완료**: A 627 (sub-cohort UI) / B 629·631 (풀어쓰기) / C 635 (모바일 350px) / D 639 (Telegram) / E 637 (sort).
- **cycle 641 = 6번째 candidate**: PredictionsTierFilter (3 chips 전체/강한/보통/박빙) ship.
- **direct 26 cycle (cycle 623~648) /predictions index 영역만 ship 7건**: status filter / sort / tier filter / 3 chip group label / count=0 disable / claudemd silent drift 5건. ROI 누적 ≥ 6 PR.
- **saturation 재발**: 직전 15 cycle (635~648) 안 saturation chain (review-code / fix-incident / polish-ui / info-arch) = 13/15 ≥ 12. trigger 7 자연 충족.
- **0회 발화 chain check** (직전 20 cycle): operational-analysis 1 / info-arch 1 / fix-incident 1 — 모두 ≥ 1회 fire. opt-out 6 chain 모두 가시.
- **2-chain alternation lock 미발동** (직전 8 cycle distinct = 5).
- **lite cap 미발동** (직전 5 partial streak 0).
- **ship-0 emergency stop 미발동** (직전 10 outcome 모두 SUCCESS).

## /predictions 페이지 현황 (cycle 648 기준)

| 컴포넌트 | cycle | 역할 |
|---|---|---|
| PredictionsStatusFilter | 634 | verified / pending 필터 (chip group "결과") |
| PredictionsSortControl | 637 | 최신순 / 오래된 순 토글 (chip group "정렬") |
| PredictionsTierFilter | 641 | 강한 / 보통 / 박빙 필터 (chip group "티어") |
| PlaceholderCard / Live | 522 | 예측 없는 경기 분기 |
| FactorBreakdown / JudgeReasoningCard | 287/335 | /predictions/[date] 내부 |
| YesterdayResultsSection | 555 | 홈 페이지 (참고용) |

**페이지 자체 데이터 단위**: date (날짜별 grouping). 각 row = `total / predicted / missing / cancelled / verified / correct / tiers (confident/lean/tossup)`. 게임 단위 X.

**누적 통계 헤더 부재**: page 전체 N건 적중률 등 summary row 0 — /accuracy 페이지로 위임 (separate destination).

**검색 / 월별 그룹 / 트렌드 지표 부재**: 시간순 LinkedList 뷰만 노출.

## 신규 candidate 5건 (F~J)

각 후보 = 1 cycle 안 closure 가능 + ship PR 1 단위.

### 후보 F — 누적 적중률 헤더 카드

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: 페이지 첫 부분 = h1 + 안내 문구 + 3 chip filter group. 누적 적중률 / 누적 예측 수 등 summary header 0건. /accuracy 페이지가 deep dive (캘리브레이션 / sub-cohort) 영역인데, /predictions index 첫 visit 시 즉시 의미 있는 숫자 부재.
**가치**: at-a-glance 신뢰 신호. 사용자가 deep dive (/accuracy) 로 이동하기 전 단계의 "이 사이트 적중률 보장" 헤더.
**ROI**: high. dates 변수 안 verified / correct 합산만 추가 + 헤더 카드 컴포넌트 신규. ~40 line. 데이터 가공 X.
**위험**: low. /accuracy 와 중복 X (one-line summary vs deep dive). v1.8 cohort 라벨 명시 시 cycle 605 spec § anomaly 라벨링 룰 적용.
**fire trigger**: 사용자 자연 발화 "적중률 한눈에" / "전체 적중률" 류, 또는 본 후보 ranking 채택 시.

### 후보 G — 월별 그룹 toggle

**chain**: explore-idea (lite)
**상태**: 200건 limit + 시간순 LinkedList 만. 월별 분류 toggle 부재 — 사용자가 "2026-05" 영역만 보고 싶을 때 scroll 필요.
**가치**: 정보 정리. 월별 적중률 자연 비교 (4월 vs 5월).
**ROI**: medium. SortControl 패턴 그대로 (chip toggle + CSS [data-month-group] visibility 토글). ~80 line + 데이터 가공 monthMap.
**위험**: SSG 영향 X (client filter). 월별 미적중 월 chip count=0 시 disable 룰 (cycle 646 패턴) 적용 필요.
**fire trigger**: 사용자 "월별로 보고 싶다" 발화, 또는 본 후보 ranking 채택 시.

### 후보 H — 검색박스 (날짜 / 팀)

**chain**: explore-idea (heavy)
**상태**: /search 페이지 = 통합 검색 (팀/선수/날짜). /predictions index = local 검색 부재. URL `/predictions?q=두산` 류 query param 미지원.
**가치**: 특정 팀 / 특정 날짜 즉시 진입. 데이터 풀 200건 = 검색 가치 ≥.
**ROI**: medium~high. /predictions/[date] 라우트 = 이미 date base. team 검색 시 dates 안 game 안 home_team_code / away_team_code 추가 SELECT 필요 (현재 페이지 안 team code 미사용). ~150 line + DB select 변경.
**위험**: SSG cache 영향 X (client search). DB select 확장 → 페이지 build size + 쿼리 비용 증가 가능. 일자 검색 = 단순 string filter, team 검색 = team code 매핑 필요.
**fire trigger**: 사용자 탐색 자연 발화 + 직전 cycle TODOS Next-Up 미진행, 또는 본 후보 ranking 채택 시.

### 후보 I — 최근 N건 trend indicator

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: 헤더 부재 (후보 F 연관). 트렌드 지표 0건 — 최근 20건 적중률 vs 전체 적중률 diff 미노출. 사용자가 "최근 모델 잘 맞나?" 인지 시 /accuracy 페이지 deep dive 필요.
**가치**: 트렌드 awareness. 최근 N건이 전체 대비 ±N%p 차이 즉시 노출.
**ROI**: medium. dates 변수 안 verified date sort 후 최근 20건 합산 + 전체 합산 diff 계산. ~50 line.
**위험**: low. 후보 F 같은 헤더 영역 = F 와 한 PR 통합 권장 (헤더 카드 안 trend chip).
**fire trigger**: 후보 F ship 이후 자연 후속, 또는 사용자 트렌드 자연 발화.

### 후보 J — 공유 버튼 (Kakao / Twitter)

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: /predictions/[date] 페이지 = 적중률 결과 노출. 외부 공유 intent URL 부재 — 사용자가 적중률 결과를 Kakao / Twitter 공유 시 URL 직접 복사 필요.
**가치**: viral / share. 적중률 결과 = 사이트 가치 증거 + 외부 traffic 유입.
**ROI**: low~medium. ~60 line + intent URL 생성 + share API fallback. KaKao 공식 share API = JS SDK 의존성 추가 부담 (라이브러리 미설치 시 intent URL 만 사용 fallback).
**위험**: 외부 API 의존 (KaKao SDK = 추가 의존성). Twitter intent URL = stable. Web Share API = 모바일 우선 지원 + fallback 필요.
**fire trigger**: 사용자 share 자연 발화, 또는 본 후보 ranking 채택 시. KaKao SDK 추가 신중 (cycle 605 외부 의존 가드 룰).

## ROI ranking + 차기 cycle 매핑

| 우선 | 후보 | 1순위 trigger | 적합 chain | 적합 mode | Fire 상태 |
|---|---|---|---|---|---|
| 1 | F 누적 적중률 헤더 | at-a-glance 가시 | explore-idea | lite (1 cycle) | **cycle 658 fire** (AccuracyHeaderCard.tsx) |
| 2 | I 최근 N건 trend | 후보 F 후속 자연 | explore-idea / polish-ui | lite (F 통합 권장) | **cycle 660 fire** (recentVerified/recentCorrect props) |
| 3 | G 월별 그룹 | 정보 정리 | explore-idea | lite (1 cycle) | **cycle 661 fire** (PredictionsMonthFilter.tsx) |
| 4 | H 검색박스 | 사용자 탐색 | explore-idea | heavy (단일 cycle ship — 분할 예상 vs 실측 차이) | **cycle 670 fire** (PredictionsSearchBox.tsx + page.tsx, +130 -1) |
| 5 | J 공유 버튼 | viral | explore-idea | lite (1 cycle) + SDK 의존성 가드 | **이미 ship 완료** (`@/components/share/ShareButtons` — analysis/matchup/predictions/[date]/reviews monthly·weekly·misses 6 page 사용. cycle 649 spec 박제 시점에 미인지 = stale claim) |

**자율 발화 정책**:
- 본 후보 5건 = saturation break 옵션 pool 갱신 (cycle 623 spec 5건 + 본 spec 5건 = 10건 누적, A~E 모두 fire 완료)
- 차기 cycle 진단 단계서 chain trigger 충족 + 본 후보 매핑 자연 시 자율 fire
- 사용자 자연 발화 시 후보 무관 fire (사용자 신호 우선)
- 후보 5건 모두 v2 transition 완료 (n=150) 이전 fire 가능 = 의존성 0

## 차기 cycle 추천 매핑 (cycle 650~660 갱신)

| Cycle | 권장 chain | mode | 근거 |
|---|---|---|---|
| **650** | **review-code** (lite) or **polish-ui** (lite) | lite | dominance balance — review-code 8/20 / polish-ui 6/20. silent drift family 자연 cleanup. 본 spec 박제 정합성 점검 후속 자연 |
| 651~654 | polish-ui lite + review-code lite | lite | saturation 자연 누적 + small fix |
| **655 ± 5** | **explore-idea (lite)** + 후보 F fire | lite | 본 spec § ROI 1순위 = 누적 적중률 헤더. cycle 661 saturation trigger 다시 도달 시 자연 fire |
| 656~660 | op-analysis lite (W24~25 baseline) | lite | n=119 → ~140 측정. cycle 632 op-analysis 이후 gap 도달 (트리거 25 cycle ≥ 658) |
| **n=150 도달 시** | op-analysis | **heavy** | v2.0 가중치 확정 (cycle 611 spec § Step C) |

## 위험 & 가드

| 위험 | mitigation |
|---|---|
| 본 후보 5건 = 자율 fire trigger 모호 → 영구 spec only 잔존 | 사용자 review 시 1~2 후보 명시적 채택 신호 → 그 후보 ranking 1st priority. 그 외엔 사용자 자연 발화 trigger 만 |
| 후보 J KaKao SDK 추가 → 외부 의존성 누적 | Twitter intent URL + Web Share API 만 fallback 우선. SDK 추가 시 사용자 명시 확인 필요 (cycle 605 외부 의존 가드 룰) |
| ~~후보 H heavy → 1 cycle 안 ship 못 끝낼 위험~~ (stale, cycle 670 ship 단일 cycle 완료 — +130 -1, sibling filter pattern 정합 덕 분할 불필요) | ~~spec 단계 + 구현 단계 2 cycle 분할 명시~~ |
| 후보 F+I 한 PR 통합 시 line ≥ 90 → lite scope 초과 | 분리 가능. F 만 단독 ship 30~40 line 안전 |
| saturation 누적 = 추가 후속 polish-ui 14th carry-over fire 회피 신호 | cycle 622 retro 명시 후속 chain rotation 강제. 같은 chain 8 연속 success 시 자가 redirect |
| 본 spec 자체 = explore-idea 2nd partial (623/649) 누적 — lite chain retro-only cap trigger 근접 | cap = 5 연속 partial. 현재 explore-idea 2 partial (623/649). 추가 3 cycle partial 시 cap 1건 잔존 |

## 후속

- ~~사용자 review pending — spec 박제 only, 구현 X~~ (stale, cycle 668 정정)
- 본 spec 후속 자율 fire 결과: F (658) / I (660) / G (661) 3건 직접 explore-idea·polish-ui lite fire + J ShareButtons 다른 cycle ship 박제 + **H (670 ship PR #959)** — 5/5 후보 모두 ship 완료
- cycle 623 spec § ROI 1순위 (A `/accuracy` sub-cohort UI) = cycle 627 fire 완료 — 본 spec § ROI 1순위 (F 누적 적중률 헤더) = cycle 658 fire (655 ± 5 예상 정합)
- ~~차기 큰 후보 후속 = H (검색박스 heavy 2 cycle 분할)~~ (stale, cycle 670 단일 cycle ship 완료) — 본 spec 5/5 후보 모두 closure. 차기 saturation break 시 신규 spec audit 필요 (cycle 623 + 649 = 10건 누적 모두 fire 완료)

## 관련

- `docs/superpowers/specs/2026-05-19-cycle-623-saturation-direction-audit.md` (parent, 5 candidates 全 fire)
- `docs/superpowers/specs/2026-05-18-cycle-611-v2-transition-step-b-mitigation-progress.md` (grandparent)
- `docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md` (grand-grandparent)
- cycle 627/629/631/635/637/639/641 cycle_state JSON (5 candidates fire 박제)
- CLAUDE.md "/predictions 컴포넌트" 섹션 (cycle 634/637/641/645/646 박제)
- TODOS.md "🎯 모델 v2.0 업그레이드 트래킹" 섹션

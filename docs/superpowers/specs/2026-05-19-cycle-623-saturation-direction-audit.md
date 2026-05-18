# 12 cycle small-fix saturation 의식 — v2 transition 대기 window 안 사용자 가치 후보 audit

**Cycle**: 623 (2026-05-19)
**Chain**: explore-idea (lite, improvement saturation trigger 7 = 12/15 ≥ 12 충족)
**Status**: spec 박제 + 사용자 review 대기 (partial)
**Parent**: `2026-05-18-cycle-611-v2-transition-step-b-mitigation-progress.md`

---

## 발화 맥락

- **cycle 622 polish-ui (lite) SUCCESS** — 7th carry-over (seasons/[year] raw text-gray dark pair 16건). retro 명시 "polish-ui carry-over 사실상 완료 — 7th 가 streak 자연 종결 후보. 다음 chain 다양성 우선"
- **saturation trigger 7 재발** (cycle 210 박제): 직전 15 cycle (608~622) review-code + fix-incident + polish-ui + info-architecture-review = 12/15 ≥ 12 충족
- **cycle 611 spec 의 차기 cycle 추천 매핑** = "622~628 operational-analysis lite" — 그러나 W23 D1 = 오늘 2026-05-19 (UTC 14 verify cron = 23:00 KST 22시간 후 = 데이터 미준비)
- **mitigation A 검증 window** = 2026-05-22~25 (현재 + 3~6일) — premature
- **0회 발화 chain check** (직전 20 cycle): 모두 ≥ 1회 fire (review-code 6 / polish-ui 6 / ops 3 / fix-incident 2 / explore-idea 2 / info-arch 1)
- **2-chain alternation lock** = 미발동 (직전 8 cycle distinct = 3)

## cycle 612 → 622 11 cycle 진행 요약

| Cycle | Chain | Outcome | 결과물 |
|---|---|---|---|
| 612 | polish-ui (lite) | SUCCESS | dashboard 4건 dark pair |
| 613 | operational-analysis (lite) | PARTIAL | next_rec timing 26분 premature 박제 |
| 614 | info-architecture-review (heavy) | SUCCESS | picks + leaderboard Breadcrumb 홈 중복 제거 |
| 615 | polish-ui (lite) | SUCCESS | leaderboard + shared surface/border 5건 |
| 616 | polish-ui (lite) | SUCCESS | predictions/dashboard/analysis/live/accuracy 9건 |
| 617 | polish-ui (lite) | SUCCESS | app/* 페이지 라우트 33건 |
| 618 | review-code (lite) | SUCCESS | /health 1112 tests baseline |
| 619 | operational-analysis (lite) | SUCCESS | n=119 DB 측정 cycle 542 memory 일치 confirm |
| 620 | polish-ui (lite) | SUCCESS | public 페이지 + 컴포넌트 12건 |
| 621 | review-code (lite) | SUCCESS | /health 1112 tests baseline 재측정 |
| 622 | polish-ui (lite) | SUCCESS | seasons/[year] 16건 (7th carry-over 종결) |

**누적 PR**: polish-ui 5건 (#814~#819), info-arch 1건 (#815), review-code 0 PR (lite mode, 코드 변경 X). PASS_ship = +6.

**유의**: 11 cycle 모두 SUCCESS streak. 그러나 모든 변경 = small fix (token sweep / breadcrumb 정렬 / baseline 재측정). 사용자 가시 product 가치 = polish 한정.

## saturation = 의식적 wait state

본 단계 = v2 transition 대기 + small-fix saturation 의 자연 공존:

- **v2 transition critical path**: cycle 611 spec line 57~70 — n=125 (5/21~24) / n=130 (5/24~29) / n=150 (6/3~18) timing 의존
- **mitigation A 검증 window**: 2026-05-22~25 (4~7일 post-apply)
- **요일별 데이터 누적**: 매일 daily fire 1~2건 verify 누적
- **사용자 manual 개입 없음**: 사용자 가시 신호 0건 (issue / 직접 발화)

이 상태에서 small-fix saturation 은 **부정적 신호 X** — silent drift family 자연 cleanup channel 유지. cycle 135 dominance-positive streak 룰 (silent drift family detection channel) 박제 인정. **단** 다음 사항 변경 필요:

1. polish-ui carry-over 종결 인지 (cycle 622 retro) → 동일 chain 8th 카리오버 fire 회피 신호
2. saturation 무한 누적 차단 — 본 spec = "wait window 안 사용자 가치 후보 5건 박제" 로 break 옵션 준비

## 사용자 가치 후보 5건 (saturation break 옵션)

각 후보 = "v2 transition 완료 (n=150) 이전에도 fire 가능한 사용자 가시 small product 가치". 5건 모두 1 cycle 안 closure 가능 + ship PR 1 단위.

### 후보 A — `/accuracy` 공개 대시보드 sub-cohort split UI

**chain**: explore-idea (heavy) 또는 polish-ui (lite)
**상태**: `/accuracy` 페이지 = cycle 287 ship. 현재 캘리브레이션 / 주별 / 팀별 그룹화 만 노출. scoring_rule sub-cohort (v1.5/v1.6/v1.7-revert/v1.8 + v1.8 real-debate sub-cohort) 노출 X.
**가치**: 사용자가 모델 evolution 가시화 가능. cycle 542 memory 박제된 sub-cohort 적중률 split 을 공개 페이지에 그대로 노출.
**ROI**: medium. UI 추가 1 file + DB 측정 코드 추가. 데이터는 이미 `predictions.scoring_rule` 컬럼에 박제.
**위험**: v1.6 anomaly (37%, < coinflip 13%p) 공개 시 사용자 혼란 → "v1.6 era 학습 결과" 라벨 명시 필요.
**fire trigger**: 사용자 자연 발화 "적중률 자세히" 류, 또는 본 후보 ranking 채택 시

### 후보 B — predictions detail 페이지 "예측 근거" 비전문가 풀어쓰기

**chain**: polish-ui (lite) 또는 explore-idea (lite)
**상태**: `/predictions/[id]` 페이지 = 에이전트 토론 reasoning 노출 중. 그러나 야구 stat 용어 (FIP / xFIP / wOBA / Elo) 그대로 = 비전문가 진입 장벽.
**가치**: 신규 사용자 retention. SEO 도 long-tail "FIP 란" 류 검색 후보.
**ROI**: low~medium. 용어 hover tooltip 추가 + 글로서리 페이지 1개 신규 = 1 cycle closure.
**위험**: 용어 정의 정확성 — KBO 통계 영역 권위 source 확인 필요.
**fire trigger**: SEO ROI 측정 자연 발화 시, 또는 본 후보 ranking 채택 시

### 후보 C — 모바일 viewport 350px 이하 UX 정렬

**chain**: polish-ui (heavy) 또는 design-review chain
**상태**: 디자인 시스템 (DESIGN.md) 기반 정렬 누적. 그러나 350px 이하 viewport (KBO 시청 모바일 + Galaxy Fold inner / iPhone SE small) 차원 자연 발화 미발화.
**가치**: 모바일 retention. KBO 시청 환경 = 모바일 다수 가정.
**ROI**: medium. 1 cycle = 1~2 page heavy review. polish-ui 와 영역 중첩 — design-review 가 보다 적합.
**위험**: 디자인 시스템 token 변경 시 cascade 영향 — design-system chain trigger 가능성.
**fire trigger**: 사용자 모바일 자연 발화, 또는 본 후보 ranking 채택 시

### 후보 D — Telegram daily summary 알림 시각 + 본문 가독성

**chain**: polish-ui (lite) 또는 fix-incident (lite)
**상태**: cycle 542 박제 = Telegram 3종 알림 구조 (announce / summary / results). 현재 시각 + 본문 가독성 자연 발화 후속 미진행.
**가치**: 알림 receiver 사용자 retention. 모바일 push 가독성 = 사용자 가시 첫 contact point.
**ROI**: low. 1 line 시각 조정 + 본문 emoji 정렬 = 30분 closure.
**위험**: 시각 변경 시 verify cron timing 의존성 충돌 가능.
**fire trigger**: 사용자 Telegram 자연 발화, 또는 본 후보 ranking 채택 시

### 후보 E — `/predictions` index 페이지 필터 + 정렬 강화

**chain**: explore-idea (lite) 또는 polish-ui (lite)
**상태**: `/predictions` index = 최신 예측 list 만 노출. 팀별 / 적중 여부 / 모델 버전 필터 미지원.
**가치**: 사용자 탐색 가시화. 적중률 시각 비교 가능.
**ROI**: medium. URL query param + client filter UI 추가 = 1~2 cycle.
**위험**: SSG 영향 — query param 기반 client filter 면 영향 X.
**fire trigger**: 사용자 탐색 자연 발화, 또는 본 후보 ranking 채택 시

## ROI ranking + 차기 cycle 매핑

| 우선 | 후보 | 1순위 trigger | 적합 chain | 적합 mode |
|---|---|---|---|---|
| 1 | A `/accuracy` sub-cohort UI | 사용자 가시 + 데이터 즉시 활용 | explore-idea → polish-ui | heavy → lite 2 cycle |
| 2 | B 예측 근거 풀어쓰기 | SEO ROI + 비전문가 retention | polish-ui | lite |
| 3 | E `/predictions` 필터 | 탐색 가시화 | polish-ui | lite |
| 4 | D Telegram 가독성 | small win | polish-ui | lite |
| 5 | C 모바일 350px | 모바일 retention | design-review | heavy |

**자율 발화 정책**:
- 본 후보 5건 = saturation break 옵션 pool 박제
- 차기 cycle 진단 단계서 chain trigger 충족 + 본 후보 매핑 자연 시 자율 fire
- 사용자 자연 발화 시 후보 무관 fire (사용자 신호 우선)
- 후보 5건 모두 v2 transition 완료 이전 fire 가능 = 의존성 0

## 차기 cycle 추천 매핑 (cycle 624~628 갱신)

cycle 611 spec line 88~92 의 매핑 갱신:

| Cycle | 권장 chain | mode | 근거 |
|---|---|---|---|
| **624 (오늘 야)** | **operational-analysis** | **lite** | UTC 14 (23:00 KST) verify cron 후 W23 D1 5건 baseline. n=119 → ~124 측정 |
| 625~628 (W23 D2~D5) | operational-analysis lite + saturation 발생 시 본 spec 후보 A~E 자율 fire | lite | 매일 D+1 baseline 누적 + sub-cohort 분리 측정 |
| **626~628 (mitigation A 4~7일 window)** | **operational-analysis lite + mitigation A 효과 측정** | lite | 2026-05-22~25 = `agentError` hallucinated_number:hard 빈도 측정 (cycle 611 spec § Step B) |
| 629~641 | op-analysis lite 반복 + 필요 시 mitigation D/C 적용 (fix-incident heavy) | lite + heavy | n=125 / 130 / 135 단계별 baseline |
| n=150 도달 시 | operational-analysis | **heavy** | v2.0 가중치 확정 (cycle 611 spec § Step C) |

## 위험 & 가드

| 위험 | mitigation |
|---|---|
| 본 후보 5건 = 자율 fire trigger 모호 → 영구 spec only 잔존 | 사용자 review 시 1~2 후보 명시적 채택 신호 → 그 후보 ranking 1st priority. 그 외엔 사용자 자연 발화 trigger 만 |
| 후보 A `/accuracy` UI 추가 시 v1.6 anomaly 공개 → 사용자 혼란 | "v1.6 era (4/22~5/3) 학습 결과 보존" 라벨 명시. cycle 605 spec § 1.6 anomaly 동일 라벨링 |
| 후보 C 모바일 350px review 시 design-system trigger 자연 발화 | design-system chain trigger 1 (`stat -f %m DESIGN.md` ≥ 4주) 별도 측정 후 의식적 chain 선택 |
| saturation 누적 = 추가 후속 13th carry-over polish-ui fire 회피 신호 | cycle 622 retro 명시 후속 chain rotation 강제. 같은 chain 8 연속 success 시 자가 redirect |
| 본 spec 자체 = explore-idea 3rd partial (605/611/623) 누적 — lite chain retro-only cap trigger 근접 | cap = 5 연속 partial. 현재 explore-idea 3 partial (605/611/623 미커밋 시점). 추가 1 cycle partial 시 cap 1건 잔존 |

## 후속

- 사용자 review pending — spec 박제 only, 구현 X
- 본 spec = cycle 624+ operational-analysis lite 발화 시 carry-over evidence + saturation break 옵션 pool
- 본 후보 5건 = 자율 fire 우선순위 ranking — 차기 cycle 진단 input

## 관련

- `docs/superpowers/specs/2026-05-18-cycle-611-v2-transition-step-b-mitigation-progress.md` (parent)
- `docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md` (grandparent)
- `docs/superpowers/specs/2026-05-18-cycle-607-h5-falsification-validator-hallucination-family.md`
- cycle 612~622 cycle_state JSON
- CLAUDE.md "예측 엔진 가중치 (v1.8 — 10팩터, 3소스)" 섹션
- TODOS.md "🎯 모델 v2.0 업그레이드 트래킹" 섹션

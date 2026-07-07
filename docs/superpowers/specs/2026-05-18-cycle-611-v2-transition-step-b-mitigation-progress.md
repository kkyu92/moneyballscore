# v2.0 전진 progress — Step A 완료 / Step B mitigation A 적용 / Step C timeline 추정

> **⚠️ STALE (cycle 1460 결정 후, 2026-07-06)** — v1.8 유지 확정. n=178 재입증 (Brier DEFAULT 0.2443 vs Learned 0.2458, 차이 0.15% < 1pp 임계) + v2.1-B rejected (Brier 0.4635, n=52). 본 spec 안 "Step C n=150 도달 시 v2.0 가중치 확정 — backtest harness + factor 정보가치 재측정" / cycle 추천 매핑 "n=150 도달 시 op-analysis heavy" 전체 superseded — v2.0 upgrade 불필요 확정. Step A/B mitigation progress evidence + n=125~150 baseline 추정은 historical archive 로 보존.

**Cycle**: 611 (2026-05-18)
**Chain**: explore-idea (lite, improvement saturation trigger = 12/15 ≥ 12 충족)
**Status**: ~~spec 박제 + 사용자 review 대기 (partial)~~ **SUPERSEDED — v1.8 유지 확정 (cycle 1460)**
**Parent**: `2026-05-18-cycle-605-v2-transition-roadmap.md`

---

## 발화 맥락

- **cycle 610 review-code (heavy) PARTIAL** — silent drift family streak 117 cycle saturation 신호
- **improvement saturation trigger** (cycle 210 박제): 직전 15 cycle review/fix/polish/info-arch = 12 ≥ 12 충족
- **cycle 610 next_rec = explore-idea (lite)** — 자연 carry-over
- 본 cycle = cycle 605 spec 의 3 step 진행 update + 차기 cycle 차원 매핑

## cycle 605 → 611 진행 요약

| Step | cycle 605 plan | 실 진행 | outcome |
|---|---|---|---|
| A — n=119 baseline | op-analysis lite (다음 1~2 cycle) | cycle 606 fire | SUCCESS — n=119 baseline + scoring_rule 5 분기 + v1.8 sub-cohort 분리 (credit-fail 15 / real-debate 10) |
| B — H5 (rate limit) 검증 | fix-incident heavy + cron stagger | cycle 607 fire (H5 falsified, real root cause = validator hallucination) + cycle 608 mitigation A 적용 | SUCCESS (partial scope shift) — Step B 본래 H5 가설 falsify + 신가설 (Haiku reasoning 야구 stat hallucination) 채택 + mitigation A 단일 line 추가 |
| C — n=150 도달 후 v2.0 가중치 확정 | op-analysis heavy | 미진행 — n=150 도달 timing 의존 | 대기 |

## Step A 결과 박제 (cycle 606)

- n=119 정확 측정 완료
- scoring_rule 분포 (cycle 542 기준 + 후속 누적): v1.5(16,75%) / v1.6(46,37%) / v1.7-revert(32,53.1%) / v1.8(25,36.0%)
- v1.8 sub-cohort: credit-fail 15건(26.7%) + real-debate 10건(50.0%)
- v2.0 임계 n=150 까지 **31건 잔존**

## Step B 진행 박제 (cycle 607-608)

### H5 falsification (cycle 607)

- H5 = "rate limit + 동시 호출" 가설
- ground truth 측정: 17 rows 중 `rate_limit_error` **0건** → falsified
- 신가설 = team-agent.ts validator strict mode + Haiku reasoning 야구 stat 수치 hallucination

### mitigation 4 후보 박제 (cycle 607)

| # | mitigation | type | risk | 적용 cycle |
|---|---|---|---|---|
| A | BASE_PROMPT 정성 표현 대안 명시 (단일 line) | prompt | low (semantic drift 가능성) | **608 (적용 + R7 머지 0477f57, 2026-05-18 23:24 KST)** |
| B | validator whitelist (수치 누락 OK 패턴) | schema | mid (false positive 증가) | 미적용 |
| C | severity 라벨 (hard/soft/info) 세분화 | schema | low (운영 메트릭만) | 미적용 |
| D | 라벨 세분화 (`hallucinated_number:hard` 등) | schema | low | 미적용 |

### mitigation A 검증 윈도우

- 적용 시점: 2026-05-18 23:24 KST (cycle 608 머지 직후)
- 검증 baseline: 7건/2일 (cycle 607 측정)
- 성공 기준: **0~2건/주** 감소
- 측정 가능 윈도우: 적용 + 4~7일 = **2026-05-22 ~ 2026-05-25 이후 op-analysis** (현재까지 = 0일 경과, 데이터 nascent)
- 측정 path: `predictions where scoring_rule='v1.8' AND metadata->>'agentError' LIKE '%hallucinated_number:hard%' AND created_at > '2026-05-18 23:24'` 카운트 / 주 단위

## Step C — n=150 도달 timeline 추정

| 시점 | n 추정 | 기준 |
|---|---|---|
| 2026-05-18 (현재) | 119 | cycle 606 측정 |
| 일평균 verify | 1~2 건 | KBO 시즌 daily 5 게임 × verify rate (월~일 일정 의존) |
| n=125 도달 추정 | +6건 = 3~6일 = **2026-05-21 ~ 2026-05-24** | op-analysis lite 5건 단위 baseline |
| n=130 | +11건 = 6~11일 = **2026-05-24 ~ 2026-05-29** | |
| n=135 | +16건 = 8~16일 = **2026-05-26 ~ 2026-06-03** | |
| n=140 | +21건 = 11~21일 = **2026-05-29 ~ 2026-06-08** | |
| n=145 | +26건 = 13~26일 = **2026-05-31 ~ 2026-06-13** | |
| **n=150 (v2.0 trigger)** | +31건 = **16~31일** = **2026-06-03 ~ 2026-06-18** | op-analysis heavy 발화 시점 |

낙관: 2026-06-03 / 비관: 2026-06-18. real-debate sub-cohort 표본 = +20건 → n=30 (sub-cohort 안정 시점, v2.0 가중치 source).

## mitigation B/C/D 적용 우선순위 (cycle 612+ 후보)

mitigation A 단독 효과 측정 후 결정. ablation 측정 ROI 우선 — 동시 적용 X.

| 우선순위 | mitigation | 적용 trigger |
|---|---|---|
| 1 | A 효과 측정 (op-analysis) | 2026-05-22 이후 1주 데이터 |
| 2-a | D (라벨 세분화) — A 효과 미흡 + hard 빈도 잔존 시 | A 측정 후 hard 빈도 ≥ 3건/주 시 |
| 2-b | C (severity 라벨) — D 와 함께 운영 메트릭 강화 | D 와 1 PR 동시 가능 |
| 3 | B (validator whitelist) — A+D+C 후에도 잔존 + false positive 허용 시 | A+D+C 측정 후 잔존 hard 빈도 ≥ 2건/주 시 |

A 측정 결과가 0건/주 도달 시 → B/C/D 보류 (over-engineering 회피).

## 차기 cycle 추천 매핑

| Cycle window | 권장 chain | mode | trigger |
|---|---|---|---|
| 612~621 (단기) | review-code → polish-ui rotation (silent drift family saturation 후 자연 redirect) | lite / heavy 자율 | saturation 후 small fix |
| **622~628 (검증 윈도우 도달)** | **operational-analysis** | **lite** | mitigation A 4~7일 검증 (2026-05-22+) + n=125 도달 baseline |
| 629~641 | operational-analysis 반복 + 필요 시 fix-incident (mitigation D/C) | lite | n=130/135/140 단계별 baseline |
| n=150 도달 시 | operational-analysis | **heavy** | v2.0 가중치 확정 — backtest harness + factor 정보가치 재측정 |

## 위험 & 가드

| 위험 | mitigation |
|---|---|
| mitigation A semantic drift (정성 표현 = Haiku reasoning 추가 변화) | 4~7일 측정 시 accuracy 자체 비교 (cycle 605 baseline 50% real-debate 대비 변동 측정) |
| n=150 도달 시 timing 6/18 비관 시나리오 | 시즌 일정 의존 — 6월 우천 취소 발생 시 timeline 연장 가능 |
| Step C backtest harness 부재 | cycle 22 spec `h1-bootstrap-ci-cycle22.md` + cycle 57 backtest-validation 결과 잔존 — 기존 harness 재활용 (cycle 605 spec 박제) |
| mitigation A 효과 미흡 + B/C/D 동시 적용 유혹 | ablation 우선 — 단일 mitigation 1주 측정 후 다음 1 적용 (지연 OK) |

## 후속

- 사용자 review pending — spec 박제 only, 구현 X
- 본 spec = cycle 622+ operational-analysis lite 발화 시 carry-over evidence

## 관련

- `docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md` (parent)
- `docs/superpowers/specs/2026-05-18-cycle-549-v18-weekday-credit-fail-hypothesis.md`
- `docs/superpowers/specs/2026-05-18-cycle-557-v18-credit-hypothesis-falsification.md`
- `docs/superpowers/specs/2026-05-14-cycle-400-v2-transition-readiness.md`
- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
- cycle 605 / 606 / 607 / 608 / 610 cycle_state JSON
- TODOS.md "v2.0 가중치 트래킹" 섹션

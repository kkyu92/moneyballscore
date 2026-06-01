# cycle 1126 explore-idea v17 — v16 inventory 풀-수렴 후 post-saturation redirect source 인벤토리

- **mode**: lite (spec write only, partial outcome — 사용자 review 대기)
- **carry-over**: v16 inventory 6 candidate 풀-수렴 (H feature flag Tier 1 shipped cycle 1120 PR #1518 + J Brier calibration plot UI shipped cycle 1125 PR #1521 + K /accuracy/shadow Footer nav shipped cycle 1122 PR #1519 + I silent drift family 19 lazy detection + L/M 사용자 영역 wait)
- **chain reason**: cycle 1125 next_rec 정합 (explore-idea lite, v17 신규 redirect source inventory 박제). v16 candidate 자율 영역 풀-수렴 (3 shipped) → 다음 layer 자율 fire opportunity 박제. lite = spec write only (auto-fire env `/office-hours` AskUserQuestion hang 회피, v15/v13/v12/v11/v10 패턴 정합)
- **last saturation series**: v15 (cycle 1102 inventory / cycle 1106 audit method) → v16 (cycle 1119 post-v15-closure) → v17 (본 spec)
- **parent spec**: `2026-06-01-cycle-1119-explore-idea-v16-post-v15-closure.md`

## phase 13 (cycle 1119~1125) ship 종합 박제

### v16 candidate 처리 종합

| candidate | scope | 처리 cycle | status |
|---|---|---|---|
| **H feature flag Tier 1** | env flag reader (v2 / v2.1-B / debate / postview) + 16 unit test | **cycle 1120 PR #1518 SHIPPED** | closed (reader layer only, callsite swap = Tier 2 carry-over) |
| I silent drift family 19 | review-code heavy 자연 발견 시 신규 family source | cycle 1124 audit (real silent drop X 결론) | lazy (사례 18 family streak 자연 유지) |
| **J Brier calibration plot UI** | CalibrationPlot 10-bucket scatter + 8 unit test + `/accuracy/shadow` 통합 | **cycle 1125 PR #1521 SHIPPED** | closed (UI scaffold 박제, n=100+ v2.1-B 도달 시 자동 활성) |
| **K /accuracy/shadow nav 진입** | Footer 도움말 column entry + STATIC_PAGES 동기 | **cycle 1122 PR #1519 SHIPPED** | closed (Footer 진입 path 박제, Header 진입 추가 = v17 carry-over) |
| L 사례 9 vercel webhook | Vercel dashboard 외부 인증 | 사용자 영역 wait | gating wait |
| M MLB cohort scraping | data source 결정 + scraping infra | 사용자 영역 wait | gating wait |

→ 자율 영역 자연 실행 가능 candidate (H + J + K) 풀-수렴 (3 shipped). 잔여 = lazy (I) + 사용자 영역 wait (L + M).

### 본 phase ship 누적

| cycle | chain | scope | PR |
|---|---|---|---|
| 1119 | explore-idea lite | v16 inventory spec write | #1517 |
| 1120 | explore-idea heavy | feature flag Tier 1 (H) | #1518 |
| 1121 | info-architecture-review lite | 30-cycle gap checkpoint (IA saturation) | (commit only) |
| 1122 | explore-idea lite | /accuracy/shadow Footer nav (K) | #1519 |
| 1123 | operational-analysis lite | gap=25 trigger 7 첫 충족 cohort snapshot | #1520 |
| 1124 | fix-incident lite | predict_final silent drop audit (real drop X) | (retro-only) |
| 1125 | explore-idea heavy | CalibrationPlot 10-bucket scatter (J) | #1521 |

→ phase 13 = 7 cycle / 6 ship (1124 audit retro-only 1건 제외) / explore-idea 4 fire (1119/1120/1122/1125, lite 2 + heavy 2). v16 → v17 transition 자연 수렴.

### v1.8 cohort 진척 (cycle 1123 op-analysis)

- cycle 1098 baseline n=42 → cycle 1123 측정: **n=42 변동 0 (25 cycle 정체, velocity 0)**
- 사례 9 family 재발 가능성 audit 필요 신호 박제 (cycle 1124 fix-incident audit → real silent drop X 결론, same-day measurement artifact)
- v2.1-B-shadow +47 = shadow filter wave 11~17 sweep evidence
- n=150 ETA: 2026-07-22 보수 추정 유지 (velocity 0 가정 시 ETA 무한 — same-day artifact 추정 정합 시 자연 회복 기대)
- 다음 op-analysis trigger 7 (25-cycle gap) = cycle 1123 + 25 = cycle 1148 (+22 cycle 후 자연 fire)

## v17 신규 redirect source 인벤토리

### 후보 N — feature flag Tier 2 실제 callsite swap (H carry-over)

- **현황 측정**: cycle 1120 PR #1518 박제 = `apps/moneyball/src/lib/feature-flags.ts` reader layer + 4 flag (v2 model / v2.1-B shadow / debate / postview) + 16 unit test. callsite swap (decideModelVersion / decideShadowVersion / debate / postview) 미적용 = Tier 2 carry-over
- **scope**: 4 callsite swap (decideModelVersion → `getV2ModelEnabled()` 조건부 / decideShadowVersion → `getShadowV21BEnabled()` 조건부 / debate flag 적용 / postview flag 적용). 기존 path fallback 유지 (kill-switch mechanism). ≈ 100 LOC + 통합 테스트
- **ROI**: high — v2.0 ship 결정 시점 (n=150 도달, ETA 2026-07-22) 직전 fire 시 즉시 ship 결정 가능. H reader 박제 의도가 v2.0 cohort 전환 시점 kill switch + canary mechanism — Tier 2 swap 부재 시 박제 효과 0
- **diff**: 4 file edit (callsite) + 4 통합 테스트 + 1 신규 file 가능 = ≈ 100~150 LOC
- **fire mode**: explore-idea heavy (1 cycle ship) 또는 expand-scope heavy
- **timing**: 즉시 fire 가능. v17 series 안 가장 자율 영역 + ROI high. **본 spec 후속 즉시 fire 권장 candidate**
- **risk**: 2 (light-medium — v2.0 / v2.1-B-shadow callsite swap = predict path critical, env flag default OFF 가정 시 production 동작 변경 X)

### 후보 O — /accuracy/shadow Header utility nav 진입 path (K carry-over)

- **현황 측정**: cycle 1122 PR #1519 박제 = Footer "도움말" column entry + STATIC_PAGES 동기 (`/accuracy/shadow` direct URL → Footer 진입 path 박제). Header utility nav 진입 path 부재 = 사용자 가시 surface 추가 가능
- **scope**: `apps/moneyball/src/components/layout/NavLinks.tsx` Header utility nav 또는 main nav 안 `/accuracy/shadow` entry 추가. 사용자 가시 surface 강화 (noindex 라우트라 SEO 가치 X, power user trust ↑). plan #21 step 2 utility nav (🌐 / ⚙️ / login) 패턴 정합
- **ROI**: 낮~중 — power user 가치 (모델 진화 시각화 path 가시). noindex 라우트라 SEO 가치 X
- **diff**: 1 file edit (NavLinks.tsx) + STATIC_PAGES 검증 (이미 박제됨) = ≈ 20 LOC
- **fire mode**: polish-ui lite (1 cycle ship) 또는 explore-idea lite
- **timing**: 즉시 fire 가능 (small + light, Tier 1)
- **risk**: 0 (small entry sync)

### 후보 P — TabPFN cohort data pipeline 자율 영역 박제 (TabPFN scout #1206 carry-over)

- **현황 측정**: `docs/research/tabpfn-status-2026-05-29.md` (cycle 1049 / cycle 1078 갱신) — Step 1/2 (feasibility + data-prep skeleton) 박제, Step 3-5 (Python sidecar 인프라 / checkpoint download / production fire) = 사용자 영역. 자율 영역 차원 신규 가능 path = supabase predict_final factor extract → `tabpfn-data-prep.csv` append cron (Python sidecar inference 부재, CSV 누적만 자율 가능)
- **scope**: `scripts/tabpfn-csv-export.ts` 신규 + DEFAULT_WEIGHTS 10팩터 정규화 + outcome binary. supabase service role export SQL. nightly cron 박제. CSV 파일 = Step 3 (사용자 영역) Python inference input. 자율 영역 한도 = CSV pipeline only, inference X
- **ROI**: 중 — Step 3 user-domain fire 시점 즉시 inference 가능 path 박제. v1.8 cohort progress 와 분리 (TabPFN train 시 별도 CSV)
- **diff**: 1 신규 file (`scripts/tabpfn-csv-export.ts`) + GitHub Actions cron 추가 + supabase export SQL = ≈ 150 LOC
- **fire mode**: explore-idea heavy 또는 expand-scope heavy
- **timing**: 즉시 fire 가능 — 단 ROI 의존 (Step 3 user-domain 진행 시점 미정). 우선순위 N 다음
- **risk**: 1 (light — read-only export, production prediction path 영향 X)

### 후보 Q — CalibrationPlot v2.1-B-shadow 자동 활성 condition (J carry-over)

- **현황 측정**: cycle 1125 PR #1521 박제 = CalibrationPlot 10-bucket scatter UI scaffold + 8 unit test. n=100+ v2.1-B 도달 시 (ETA 2026-06-17, 잔여 48건) Platt / isotonic application + 3-way 비교 (v1.8 / v2.0-shadow / v2.1-B-shadow) 활성 가능 — 단 현 UI 가 자동 활성 condition 가졌는지 미박제
- **scope**: CalibrationPlot.tsx 안 cohort_n >= 100 condition check + Platt scaling toggle + post-calibration Brier 비교 layer. data layer fetch (v2.1-B-shadow cohort) + ChartJS 또는 react-chartjs-2 추가 가능
- **ROI**: 중 — v2.0 가중치 결정 evidence visual 강화. n=100+ v2.1-B (ETA 16일 후) 도달 시 즉시 활성
- **diff**: 1 file edit (CalibrationPlot.tsx) + data fetch layer + ≈ 100~150 LOC + 추가 unit test
- **fire mode**: explore-idea heavy 또는 polish-ui heavy
- **timing**: n=100+ v2.1-B 도달 ETA 2026-06-17 가까울 시 fire (cycle 1126~1148 안 자연 fire 가능)
- **risk**: 1 (UI 변경 light + data layer 변경)

### 후보 R — silent drift family 19 자연 발견 (I carry-over)

- **현황 측정**: 사례 18 family wave 11 saturation (cycle 1118) + cycle 1124 audit (real silent drop X) 후 family 19 source 미박제. R5 메타 패턴 "매 fix 가 다음 layer 노출" — 가능 후속 source = (a) STATIC_PAGES 외 nav 진입 path silent 누락 (Header utility nav / Footer 4th column) (b) hreflang alternates routes vs sitemap mismatch (c) cohort_n 진척 cron silent skip alert coverage gap (d) Sentry warning channel rollout dimension coverage gap (e) MLB UI 라우트 추가 후 KBO/MLB cross-link silent skip
- **scope**: review-code heavy 가 자연 source 발견 시 신규 family 박제. 본 spec 안 명시 trigger X (lazy detection — wave 12 자동 재발 trigger 조건과 동일)
- **fire mode**: review-code heavy 자연 fire 시
- **timing**: 자연 발견 시 (lazy)
- **risk**: 0 (lazy detection — false positive 차단)

### 후보 S — MLB cohort scraping infra 박제 (사용자 영역 wait, plan #21 step 4 carry-over)

- **현황 측정**: plan #21 step 3 shipped (MLB UI 3 step 풀-수렴, /mlb/players/[id] + Header utility nav + E2E hreflang spec). step 4 = MLB data source 결정 (MLB Stats API / FanGraphs MLB / Baseball Savant) + scraping 인프라 결정 = 사용자 영역
- **scope**: 사용자 영역 — 본 메인 자율 X
- **fire mode**: 사용자 결정 후 자연 fire
- **timing**: 사용자 결정 wait
- **risk**: n/a (사용자 영역)

### 후보 T — debate / postview flag Tier 2 callsite swap (H carry-over 분리)

- **현황 측정**: 후보 N (v2.0 / v2.1-B callsite swap) 과 동급 lazy carry-over. debate flag = 토론 mode trigger + postview flag = post-game view trigger. H Tier 1 reader 박제됨, callsite swap 부재
- **scope**: debate / postview callsite swap (2 file edit + 2 통합 테스트). N 과 분리 (debate / postview 는 critical path X, env flag default OFF 가정 시 production 동작 변경 X)
- **ROI**: 낮 — N 의 v2.0 / v2.1-B 가 critical, debate / postview = experimental feature flag. fire 우선순위 낮
- **diff**: 2 file edit + 2 통합 테스트 = ≈ 50~80 LOC
- **fire mode**: explore-idea lite 또는 polish-ui lite
- **timing**: N 후속 fire 가능 (소비자 가시 surface 추가 시점)
- **risk**: 0 (non-critical path, env flag default OFF)

## v17 inventory ROI 우선순위 평가

| 후보 | ROI | 자율 가능 | risk | 의존성 | Tier | 우선순위 |
|---|---|---|---|---|---|---|
| N feature flag Tier 2 (v2.0 + v2.1-B callsite swap) | high | yes | 2 | none (Tier 1 H 박제됨) | 2 | **본 spec 후속 즉시 fire 권장** |
| O /accuracy/shadow Header nav | 낮~중 | yes | 0 | none | 1 | 즉시 fire 가능 (small) |
| P TabPFN cohort CSV pipeline | 중 | yes | 1 | Step 3 user-domain 진행 시점 미정 | 2 | N 후속 |
| Q CalibrationPlot v2.1-B 자동 활성 | 중 | yes | 1 | n=100+ v2.1-B ETA 2026-06-17 | 2 | n=100+ 도달 가까울 시 |
| R silent drift family 19 | 중 | partial (자연 발견) | 0 | review-code heavy | 3 | 자연 발견 시 (lazy) |
| S MLB cohort scraping | n/a | no | n/a | 사용자 결정 | 4 | wait |
| T debate / postview flag Tier 2 | 낮 | yes | 0 | N 후속 | 3 | N 후속 시점 |

## 본 spec 결정

- **lite spec write only** — 자율 영역 신규 ship X (carry-over inventory cataloging)
- **다음 cycle next_recommended** = explore-idea (heavy, 후보 N feature flag Tier 2 callsite swap) 또는 polish-ui (lite, 후보 O /accuracy/shadow Header nav) 또는 op-analysis (gap=3, +22 cycle 후 trigger 7 25-cycle 충족 cycle 1148 ETA) 또는 review-code (lite/heavy, family 19 자연 발견 시) 또는 fix-incident (gap=2, trigger 7 20-cycle gap=18 미충족 → 자연 발화 X) 또는 info-arch (gap=5, trigger 9 30-cycle gap=25 미충족)
- **자율 vs 사용자 영역 비율**: 자율 = 후보 N/O/P/Q/R/T (6) / 사용자 영역 = S (1) — v16 대비 자율 candidate ↑ (H/J/K shipped → N/O/P/Q/T 신규 surface 5개). 자율 영역 → 사용자 영역 비율 6:1 (v16 4:2 = 2:1) 자연 redirect 정합 (plan ship saturation 후 다음 layer 자율 fire opportunity ↑ trend 지속)

## 자가 검증 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  candidate_N_feature_flag_tier_2:
    가치: high (v2.0 cohort 전환 시점 kill switch + canary mechanism 활성)
    시간_비용: small~medium (≤ 150 LOC callsite swap + 통합 테스트)
    risk: 2 (predict path critical, env flag default OFF 가정 시 production 동작 변경 X)
    자율_가능: yes
    의존성: none (Tier 1 H 박제됨)
    tier: 2 (medium + 자가 검증 후) 또는 1 (Tier 1 의 자연 후속)
  candidate_O_accuracy_shadow_header_nav:
    가치: low~medium (사용자 가시 surface, noindex 라우트라 SEO 가치 X)
    시간_비용: small (≤ 20 LOC NavLinks edit + STATIC_PAGES 검증)
    risk: 0 (small entry sync)
    자율_가능: yes
    의존성: none
    tier: 1 (small + light, 즉시 fire)
  candidate_P_tabpfn_csv_pipeline:
    가치: medium (Step 3 user-domain fire 시점 즉시 inference input 박제)
    시간_비용: medium (≤ 150 LOC export script + cron + SQL)
    risk: 1 (read-only export, production path 영향 X)
    자율_가능: yes
    의존성: Step 3 user-domain 진행 시점 미정 (CSV 박제 자체는 즉시 가능)
    tier: 2 (medium + 자가 검증 후)
  candidate_Q_calibration_v21b_auto_activate:
    가치: medium (v2.0 가중치 결정 evidence visual 강화)
    시간_비용: medium (≤ 150 LOC CalibrationPlot edit + data fetch + Platt scaling)
    risk: 1 (UI 변경 light)
    자율_가능: yes
    의존성: n=100+ v2.1-B (ETA 2026-06-17)
    tier: 2 (medium + 의존성 wait)
  baseline_v16_closure:
    candidates_closed: ["H feature flag Tier 1 PR #1518", "J Brier calibration plot UI PR #1521", "K /accuracy/shadow Footer nav PR #1519"]
    candidates_lazy: ["I silent drift family 19 (cycle 1124 audit real drop X)"]
    candidates_wait_user: ["L 사례 9 vercel webhook", "M MLB cohort scraping"]
  baseline_brier_v1_8_real: 0.2416 (cycle 1098 n=42, cycle 1123 n=42 변동 0)
  baseline_brier_v2_1_B_shadow: pending fresh measurement (cycle 1098 0.4635 = stale 25 cycle)
  baseline_accuracy_v1_8_real: 57.1% (cycle 1098 n=42, cycle 1123 n=42 변동 0)
  v1_8_velocity: 0/day (cycle 1098 → cycle 1123 25 cycle 변동 X — same-day artifact 추정, cycle 1124 audit real drop X 결론)
  next_milestone_v2_0_decision: n=150 도달 (ETA 2026-07-22, 잔여 108건, velocity 0 가정 시 ETA 무한)
  next_milestone_calibration_audit: n=100+ v2.1-B (ETA 2026-06-17 stale baseline, fresh 측정 wait)
  next_milestone_op_analysis_trigger_7: cycle 1148 (gap=25, +22 cycle 후)
  saturation_series_progression: v10 → v11 → v12 → v13 → v14 → v15 → v16 → v17 (7-step series, 약 10 cycle 간격)
```

## skill-evolution 평가 (자가 의심 차단)

- cycle 1126 % 50 ≠ 0 (trigger 3 X)
- chain-evolution subtype 누적 ≥ 5 = 별도 git history 측정 필요 (지금 trigger X 가정)
- 같은 chain 5회 연속 fail = X (explore-idea last 5 = 1106/1119/1120/1122/1125 all success)
- 직전 20 사이클 chain pool 의 chain 1개 0회 발화 (영구 opt-out 9개 제외, 평가 대상 review-code 1개) = review-code 1107~1118 안 8회 fire = trigger X
- meta-pattern body "SKILL 갱신 필요" = X

→ skill-evolution trigger 미충족. signal next_n=N-1 = 15 정상 진행.

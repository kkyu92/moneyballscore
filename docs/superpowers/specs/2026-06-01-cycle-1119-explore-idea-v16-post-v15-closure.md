# cycle 1119 explore-idea v16 — v15 inventory 풀-수렴 후 post-saturation redirect source 인벤토리

- **mode**: lite (spec write only, partial outcome — 사용자 review 대기)
- **carry-over**: v15 inventory 7 candidate 풀-수렴 (E shipped cycle 1103 PR #1501 + B method spec cycle 1106 + G family 18 wave 1~11 sweep cycle 1108~1118 + A/C/D/F gating/사용자 wait) + family 18 review-code lite 8 SUCCESS streak saturation (cycle 1108~1118, wave 11 잔여 actionable drift 0건)
- **chain reason**: improvement saturation trigger 12/15 충족 (review-code 10 + fix-incident 1 + expand-scope 1 in cycle 1105~1118 window) — 신규 product direction 점검 신호 자연 fire. lite = spec write only (auto-fire env `/office-hours` AskUserQuestion hang 회피, v15/v13/v12 패턴 정합)
- **last saturation series**: v15 (cycle 1102 inventory / cycle 1106 audit method) → v16 (본 spec)
- **parent spec**: `2026-06-01-cycle-1102-explore-idea-v15-redirect-sources.md` + `2026-06-01-cycle-1106-explore-idea-v15-brier-calibration-audit.md`

## phase 12 (cycle 1101~1118) ship 종합 박제

### v15 candidate 처리 종합

| candidate | scope | 처리 cycle | status |
|---|---|---|---|
| A v1.6 anomaly | era별 factor backtest | n=150 ETA 2026-07-22 wait | gating wait |
| B Brier calibration audit | Platt / isotonic 적용 + post-calibration Brier | cycle 1106 method spec | n=100+ v2.1-B (현 n=52) wait |
| C Thursday cap | judge-agent.ts confidence_clamp | 사용자 결정 wait | 사용자 결정 wait |
| D /mlb/factors Step 4 | placeholder 영문 mirror 9 page | plan #21 step 4 | 사용자 영역 wait |
| **E v2-shadow-monitor** | era별 cohort dashboard | **cycle 1103 PR #1501 SHIPPED** | closed |
| F TabPFN PoC | external Python ML | 사용자 영역 wait | 사용자 결정 wait |
| **G family 18 silent drift sweep** | 3-way audit (routes / sitemap / STATIC_PAGES) | **cycle 1108~1118 11 waves SHIPPED** | closed (saturation, 잔여 drift 0건) |

→ 자율 영역 자연 실행 가능 candidate (E + G) 풀-수렴. 잔여 = gating wait (A + B) + 사용자 결정 wait (C + D + F).

### family 18 wave 1~11 ship 누적

| wave | cycle | scope | PR |
|---|---|---|---|
| 1 | 1108 | v2-shadow-monitor JSON-LD era drift fix | #1506 |
| 2~4 | 1109~1111 | Breadcrumb 홈 double-prepend sweep | #1507~1509 |
| 5~6 | 1112 | STATIC_PAGES 신규 area 6 entry sync | #1510 |
| 7~8 | 1113 | STATIC_PAGES sitemap canonical 4 entry sync | #1511 |
| 9 | 1116 | STATIC_PAGES MLB 6 + KBO 3 entry sync | #1513 |
| 10 | 1117 | sitemap.ts /calendar canonical sync | #1515 |
| 11 | 1118 | STATIC_PAGES /reviews/misses single entry sync | #1516 |

→ 3-way audit (routes vs sitemap vs STATIC_PAGES) 첫 적용 후 잔여 actionable drift 0건. wave 12 trigger = 신규 route 추가 또는 nav 갱신 시 자동 재발 (lazy detection).

### v1.8 cohort 진척 (cycle 1098 op-analysis)

- cycle 989 baseline n=27 → cycle 1098 n=42 (+15건 / +12.7pp acc 44.4% → 57.1% / Brier 0.2487 → 0.2416)
- ETA: 2026-07-22 (잔여 108건 / velocity 3.0/day, 직전 ETA 2026-08-04 → 2주 단축)
- 다음 op-analysis trigger 7 (25-cycle gap) = cycle 1098 + 25 = cycle 1123 (+4 cycle 후 자연 fire)

## v16 신규 redirect source 인벤토리

### 후보 H — feature flag system Tier 1 구현 (cycle 1114 spec carry-over)

- **현황 측정**: `docs/superpowers/specs/2026-06-01-feature-flag-system-spec.md` (cycle 1114 expand-scope lite ship, PR #1512) — Tier 1 = env flag layer (≤ 200 LOC) + 기존 BIGMATCH_ENABLED 재사용 패턴
- **scope**: `apps/moneyball/src/lib/feature-flags.ts` 확장 (env-based flag layer) + v2.0 / v2.1-B-shadow / debate / postview 4개 flag 박제 + 단위 테스트. v2.0 cohort 전환 시점 kill switch + canary mechanism layer 박제 (kill-switch 단일 layer 부재 risk 차단)
- **ROI**: high — v2.0 ship 결정 시점 (n=150 도달, ETA 2026-07-22) 직전 fire 시 ship risk 차단 mechanism 박제. 사전 fire 가치 ↑ (n=150 도달 후 즉시 ship 결정 가능 path)
- **diff**: 1 신규 file (feature-flags.ts 확장) + 4 callsite swap (decideModelVersion / decideShadowVersion / debate / postview) + 4 unit test = ≈ 200 LOC
- **fire mode**: explore-idea heavy (1 cycle ship) 또는 expand-scope heavy
- **timing**: 즉시 fire 가능. v16 series 안 가장 자율 영역 + ROI high. **본 spec 후속 즉시 fire 권장 candidate**

### 후보 I — silent drift family 19 후보 발견 검토 (carry-over)

- **현황 측정**: family 18 wave 11 saturation 후 다음 family source 후속 미박제. R5 메타 패턴 evidence "매 fix 가 다음 layer 노출" — 가능 후속 source = (a) STATIC_PAGES 외 nav 진입 path silent 누락 (Header utility nav / Footer 4th column) (b) hreflang alternates routes vs sitemap mismatch (c) cohort_n 진척 cron silent skip alert coverage gap (d) Sentry warning channel rollout dimension coverage gap
- **scope**: review-code heavy 가 자연 source 발견 시 신규 family 박제. 본 spec 안 명시 trigger X (lazy detection — wave 12 자동 재발 trigger 조건과 동일)
- **fire mode**: review-code heavy 자연 fire 시
- **timing**: 자연 발견 시 (lazy)

### 후보 J — accuracy/page.tsx Brier calibration plot UI 강화 (cycle 1106 method spec carry-over)

- **현황 측정**: cycle 1106 audit method spec 박제 — n=100+ v2.1-B 누적 wait. 현 n=52, 잔여 48건 + velocity 3.0/day = ETA 16일 (2026-06-17). Platt / isotonic implementation harness + post-calibration Brier 비교 method 박제됨. UI 시각화 layer 부재
- **scope**: `apps/moneyball/src/components/accuracy/CalibrationPlot.tsx` 신규 + buildCalibration() output 10-bucket scatter render. v2.1-B-shadow / v1.8 / v2.0-shadow 3 way 비교. Brier 0.4635 vs 0.2416 시각 차이 + Platt scaling 적용 시점 toggle
- **ROI**: 중 — v2.0 가중치 결정 evidence visual 강화 (사용자 가시 trust ↑). 단 n=100+ v2.1-B 누적 wait 의존
- **fire mode**: explore-idea heavy (1 cycle ship) 또는 polish-ui heavy
- **timing**: n=100+ v2.1-B (ETA 2026-06-17) 후 또는 본 spec 즉시 UI scaffold 박제 (n 도달 시 자동 활성)

### 후보 K — accuracy/shadow page 자동 nav 진입 path 박제 (사용자 가시 surface)

- **현황 측정**: `/accuracy/shadow` (apps/moneyball/src/app/accuracy/shadow/page.tsx) ship 됨 단 Header nav 또는 Footer 진입 path 부재 (cycle 1118 audit 결과 noindex + nav 링크 0건 정상 false positive). 사용자 가시 = direct URL only
- **scope**: `/v2-shadow-monitor` Footer "모델 진화" column entry 또는 `/accuracy/shadow` link 추가. STATIC_PAGES 동기 + sitemap canonical 동기 (family 18 3-way audit 패턴 정합). 사용자 모델 진화 시각화 path 강화
- **ROI**: 낮~중 — AdSense trust + power user 가치. 단 noindex 라우트라 SEO 가치 X. 자율 영역 코드 변경 ≤ 30 LOC small
- **fire mode**: polish-ui lite (1 cycle ship) 또는 explore-idea lite
- **timing**: 즉시 fire 가능 (small + light, Tier 1)

### 후보 L — 사례 9 family vercel.com dashboard webhook 점검 (carry-over plan #10)

- **현황 측정**: plan #10 X5 carry-over — Vercel dashboard webhook 잔존 가능성 (사례 9 family auto-deploy gap 14건 silent drift 누적). 본 메인 자율 X (Vercel dashboard 외부 인증 영역) — 사용자 영역
- **scope**: 사용자 영역 — 본 메인 자율 X
- **fire mode**: 사용자 결정 후 자연 fire
- **timing**: 사용자 결정 wait

### 후보 M — MLB cohort 박제 시작 (사용자 영역 wait + 본 메인 후속)

- **현황 측정**: plan #21 MLB UI 3 step shipped, /mlb/factors PR #1491 박제 완료. MLB 예측 cohort 박제 시작 (data scraping + predict path) = 사용자 영역 (KBO 와 별도 data source MLB Stats API / FanGraphs MLB / Baseball Savant 결정 + scraping 인프라 결정 wait)
- **scope**: 사용자 영역 — 본 메인 자율 X
- **fire mode**: 사용자 결정 후 자연 fire
- **timing**: 사용자 결정 wait

## v16 inventory ROI 우선순위 평가

| 후보 | ROI | 자율 가능 | risk | 의존성 | Tier | 우선순위 |
|---|---|---|---|---|---|---|
| H feature flag Tier 1 | high | yes | 1 | none (Tier 1 only) | 1 | **본 spec 후속 즉시 fire 권장** |
| I silent drift family 19 | 중 | partial (자연 발견) | 0 | review-code heavy | 3 | 자연 발견 시 (lazy) |
| J Brier calibration plot UI | 중 | yes | 1 | n=100+ v2.1-B ETA 2026-06-17 | 2 | UI scaffold 즉시 fire 가능 |
| K /accuracy/shadow nav 진입 | 낮~중 | yes | 0 | none | 1 | 즉시 fire 가능 (small) |
| L 사례 9 vercel webhook | n/a | no | n/a | 사용자 결정 | 4 | wait |
| M MLB cohort 박제 | n/a | no | n/a | 사용자 결정 | 4 | wait |

## 본 spec 결정

- **lite spec write only** — 자율 영역 신규 ship X (carry-over inventory cataloging)
- **다음 cycle next_recommended** = explore-idea (heavy, 후보 H feature flag Tier 1 구현) 또는 polish-ui (lite, 후보 K /accuracy/shadow nav 진입) 또는 op-analysis (gap=21, +4 cycle 후 trigger 7 25-cycle 충족) 또는 review-code (lite, family 18 wave 12 신규 source 자연 발견 시) 또는 사용자 영역 wait
- **자율 vs 사용자 영역 비율**: 자율 = 후보 H/I/J/K (4) / 사용자 영역 = L/M (2) — v15 대비 자율 candidate ↑ (E/G shipped → H/J/K 신규 surface). 자율 영역 → 사용자 영역 비율 4:2 (v15 3:4) 자연 redirect 정합 (plan ship saturation 후 다음 layer 자율 fire opportunity ↑)

## 자가 검증 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  candidate_H_feature_flag_tier_1:
    가치: high (v2.0 cohort 전환 시점 kill switch + canary mechanism)
    시간_비용: small (≤ 200 LOC env flag layer + 4 callsite swap + 4 unit test)
    risk: 1 (light noise — 기존 BIGMATCH_ENABLED 패턴 재사용)
    자율_가능: yes
    의존성: none (Tier 1 only)
    tier: 1 (small + light, 즉시 fire)
  candidate_J_calibration_plot_ui:
    가치: medium (v2.0 결정 evidence visual 강화)
    시간_비용: medium (CalibrationPlot.tsx + buildCalibration output render + 3-way 비교)
    risk: 1 (UI 변경 light)
    자율_가능: yes
    의존성: n=100+ v2.1-B (ETA 2026-06-17)
    tier: 2 (medium + 자가 검증 후) 또는 1 (UI scaffold pre-fire)
  candidate_K_accuracy_shadow_nav:
    가치: low~medium (사용자 가시 surface, noindex 라우트라 SEO 가치 X)
    시간_비용: small (≤ 30 LOC Footer column + STATIC_PAGES + sitemap)
    risk: 0 (small entry sync)
    자율_가능: yes
    의존성: none
    tier: 1 (small + light, 즉시 fire)
  baseline_v15_closure:
    candidates_closed: ["E v2-shadow-monitor PR #1501", "G family 18 11 waves PR #1506~#1516"]
    candidates_wait_gating: ["A n=150 ETA 2026-07-22", "B n=100+ v2.1-B ETA 2026-06-17"]
    candidates_wait_user: ["C Thursday cap", "D /mlb/factors Step 4", "F TabPFN PoC"]
  baseline_brier_v1_8_real: 0.2416 (cycle 1098 n=42)
  baseline_brier_v2_1_B_shadow: 0.4635 (cycle 1098 n=52)
  baseline_accuracy_v1_8_real: 57.1% (cycle 1098 n=42)
  next_milestone_v2_0_decision: n=150 도달 (ETA 2026-07-22, 잔여 108건)
  next_milestone_calibration_audit: n=100+ v2.1-B (ETA 2026-06-17, 잔여 48건)
  next_milestone_op_analysis_trigger_7: cycle 1123 (gap=25, +4 cycle 후)
```

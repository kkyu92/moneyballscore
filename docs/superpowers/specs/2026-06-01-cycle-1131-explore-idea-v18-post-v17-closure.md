# cycle 1131 explore-idea lite — v18 post-v17 closure inventory

- **cycle**: 1131
- **chain**: explore-idea (lite)
- **mode**: lite — spec write only (자율 fire 가능 신규 candidate 인벤토리 박제)
- **carry-over**: v17 inventory 7 candidate 풀-수렴 (N feature flag Tier 2 callsite swap shipped cycle 1127 PR #1523 + O /accuracy/shadow Header utility nav shipped cycle 1129 PR #1524 + P TabPFN CSV pipeline body 박제 shipped cycle 1130 PR #1525 + **T debate/postview flag Tier 2 callsite swap = N 안 통합 처리 silent closure cycle 1127** + Q CalibrationPlot v2.1-B 자동 활성 wait n=100+ + R silent drift family 19 lazy + S MLB cohort scraping 사용자 영역 wait)
- **chain reason**: cycle 1130 next_rec 정합 (explore-idea lite v17 candidate T = N 안 통합 silent closure 발견 + v18 신규 redirect source inventory 박제). v17 자율 영역 풀-수렴 (3 shipped + 1 silent closure = 4/7) → 다음 layer 자율 fire opportunity 박제. lite = spec write only (auto-fire env `/office-hours` AskUserQuestion hang 회피, v15/v13/v12/v11/v10/v16/v17 패턴 정합)

## phase 14 (cycle 1126~1130) ship 종합 박제

### v17 candidate 처리 종합

| candidate | scope | 처리 cycle | status |
|-----------|-------|-----------|--------|
| N — feature flag Tier 2 (v2.0 / v2.1-B / debate / postview callsite swap 통합) | medium (≤150 LOC, 4 flag swap) | 1127 | shipped PR #1523 |
| O — /accuracy/shadow Header utility nav | small (≤20 LOC NavLinks edit) | 1129 | shipped PR #1524 |
| P — TabPFN cohort CSV pipeline (export script + lib + 21 unit test + 18 column schema) | medium (~600 LOC, body 박제) | 1130 | shipped PR #1525 |
| T — debate / postview flag Tier 2 callsite swap | small (~50 LOC) | 1127 (N 안 통합) | **silent closure — N 안 4 flag 동시 swap 처리됨** |
| Q — CalibrationPlot v2.1-B 자동 활성 condition + Platt scaling | medium (~150 LOC) | wait | **dependency wait** — n=100+ v2.1-B 도달 (real n=42, velocity 0 stale, ETA 무한) |
| R — silent drift family 19 자연 발견 | medium (lazy) | wait | **lazy** — review-code heavy 자연 fire 시 (cycle 1124 audit real drop X 결론 후속) |
| S — MLB cohort scraping infra 박제 | medium (사용자 영역) | wait | **사용자 영역** — Statcast / MLB.com / FanGraphs scraping infra (plan #21 step 4 carry-over, 사용자 결정 wait) |

→ 자율 영역 자연 실행 가능 candidate (N + O + P + T) 풀-수렴 (3 shipped + 1 silent closure). 잔여 = lazy (R) + dependency wait (Q) + 사용자 영역 wait (S).

**candidate T silent closure 발견**:

```bash
$ grep -rn "DEBATE_ENABLED\|POSTVIEW_ENABLED" packages/kbo-data/src/pipeline
packages/kbo-data/src/pipeline/postview-daily.ts:197:      // cycle 1127 plan-v17 candidate N Tier 2 — POSTVIEW_ENABLED=false (kill switch) 시 LLM
packages/kbo-data/src/pipeline/postview-daily.ts:212:            judgeReasoning: 'POSTVIEW_ENABLED=false kill switch — quant fallback 박제.',
packages/kbo-data/src/pipeline/postview-daily.ts:216:            agentError: 'POSTVIEW_ENABLED=false',
packages/kbo-data/src/pipeline/daily.ts:641:    // cycle 1127 plan-v17 candidate N Tier 2 — DEBATE_ENABLED=false (kill switch) 시 LLM debate
```

cycle 1127 commit message ("V2_MODEL_ENABLED + V21B_SHADOW_ENABLED + DEBATE_ENABLED + POSTVIEW_ENABLED 박제") 가 4 flag 모두 swap 명시. v17 spec body 의 candidate T section ("N 후속 fire 가능") 은 cycle 1126 시점 인지 X — cycle 1127 N 박제 시 통합. **fire 우선순위 낮 + non-critical path** 였기에 N 안 통합 자연 (별도 fire 비용 절감).

본 발견 = silent closure 패턴 (사례 16 family 변종) — spec body 가 cataloging stale 이지만 코드 차원 자율 closure 자연. spec body update 비용 (≤5 LOC) vs v18 신규 inventory 박제 ROI 비교 → 후자 우선 (carry-over evidence 풀-수렴 확정).

### 본 phase ship 누적

- 본 phase ship: 3 PR (#1523 + #1524 + #1525, cycle 1127/1129/1130). silent closure 1건 (T = cycle 1127 N 안 통합)
- silent drift family streak 누적: review-code (heavy) detection channel 안 자연 통합 패턴 지속 (cycle 458 ~ cycle 1131 = ~673 cycle, silent drift family wave 17 cycle 1099 closure 후 wave 18 자연 진행 가능)
- v17 자율 영역 풀-수렴 phase = phase 13 (cycle 1119-1125 v16 closure 3 ship) + phase 14 (cycle 1126-1130 v17 closure 3 ship + 1 silent closure)

### v1.8 cohort 진척 (cycle 1123 op-analysis baseline)

cycle 1123 op-analysis lite measure (gap=25 trigger 7 첫 충족) baseline:

- real n=42 (v1.8 cohort)
- Brier 0.2416 (cycle 1098 → cycle 1123 변동 0)
- accuracy 57.1% (cycle 1098 → cycle 1123 변동 0)
- velocity 0/day (cycle 1098 → cycle 1123 25 cycle 변동 X, same-day artifact 추정, cycle 1124 audit real drop X 결론)
- n=150 milestone ETA 무한 (velocity 0 가정)
- next op-analysis trigger 7 ETA: cycle 1148 (gap=25, +17 cycle 후)

→ candidate Q dependency (n=100+ v2.1-B) wait infinite. v18 inventory 박제 시 Q 후보 유지 + 별도 자율 영역 fire opportunity 우선.

## v18 신규 redirect source 인벤토리

### 후보 U — silent drift family 20 lazy detection (R carry-over)

- **현황 측정**: cycle 1124 fix-incident lite — predict_final silent drop audit (사례 18 family 후속 확인) PASS, family 19 audit 결과 real drop X. family 20 자연 발견 wait
- **scope**: review-code heavy 자연 fire 시 PRODUCTION_COHORT_RULES filter 누락 / shadow row 누적 / status field stale 카테고리 자연 발견
- **ROI**: 중 (silent drift family wave 17 사이클 1067-1099 cleanup 후 wave 18 자연 fire 가능, lazy)
- **diff**: lazy (자연 발견 시 ≤80 LOC fix)
- **fire mode**: review-code heavy 또는 fix-incident lite (자연 발견 시점)
- **timing**: 자연 발견 시 (R carry-over)
- **risk**: 0 (lazy fix, silent drift family pattern 7 wave detection channel 안정)

### 후보 V — CalibrationPlot v2.1-B 자동 활성 condition + Platt scaling (Q carry-over)

- **현황 측정**: cycle 1125 PR #1521 CalibrationPlot 10-bucket scatter 박제 + /accuracy/shadow 통합. v2.1-B-shadow 데이터 series 박제. **자동 활성 condition (n=100+) 부재** — 현재 데이터 X 시 "calibration plot 측정에는 더 많은 검증 예측이 필요합니다" 메시지만. v2.1-B n 도달 시 자동 활성 layer 박제 필요. Platt scaling 부재
- **scope**: CalibrationPlot edit (n 측정 + 자동 활성 condition) + Platt scaling 측정 (data fetch + lib) + UI overlay (Platt 적용 / 미적용 toggle)
- **ROI**: 중 (v2.0 가중치 결정 evidence visual 강화). 본 cycle 시점 velocity 0 → wait infinite
- **diff**: medium (~150 LOC CalibrationPlot edit + ~100 LOC Platt scaling lib + ~30 LOC data fetch)
- **fire mode**: explore-idea heavy (Q dependency 만료 시) 또는 pre-cohort 박제 lite (n 도달 wait 없이 code layer 박제, data 도달 시 자동 활성)
- **timing**: n=100+ v2.1-B 도달 시 (Q dependency wait). pre-cohort 박제 가능 (velocity 0 stale 시 wait 무한)
- **risk**: 1 (UI 변경 light, data 도달 시 자동 활성 layer fail silent risk 차단 필요)

### 후보 W — MLB cohort scraping infra body 박제 (S carry-over 분리)

- **현황 측정**: plan #21 step 4 = MLB cohort scraping (Statcast / MLB.com / FanGraphs) 사용자 영역 wait. body 박제 자체는 본 메인 자율 가능 — 사용자 결정 후 즉시 fire 가능 layer
- **scope**: 사용자 결정 후 fire 가능 layer 박제 (S 사용자 영역 결정 부분 + W = body 자율 박제 분리). plan #21 step 4 carry-over → spec body 박제 (scraping infra design + cron schedule + DB schema 후보)
- **ROI**: 낮~중 (사용자 결정 wait 부분 제외 시 body 박제 자체는 즉시 fire 가능)
- **diff**: medium (~100 LOC spec body + 사용자 결정 후 ~400 LOC scraping infra 박제 wait)
- **fire mode**: explore-idea lite (spec body 박제 only)
- **timing**: 사용자 결정 후 fire layer wait. spec body 박제 자체는 즉시 fire 가능
- **risk**: 0 (spec body 박제, 코드 변경 X)

### 후보 X — Header utility nav 5번째 item dropdown 분리 (O 후속, polish-ui carry-over)

- **현황 측정**: cycle 1129 O Tier 1 ship 시 KBO_NAV 예측·기록 group 안 /accuracy/shadow entry 5번째 박제. 4 item → 5 item dropdown crowd 증가. dropdown 5 item 시 모바일 viewport touch target 압축 (Header.tsx grep 결과 group count 변동 X 박제됨)
- **scope**: /accuracy/shadow entry 별도 utility nav slot 분리 (예: Header 우측 secondary group "기록" dropdown). 또는 dropdown 5 item 유지 + spacing 조정 (mobile touch target 44px 이상)
- **ROI**: 낮 (사용자 가시 surface 미세 polish, A/B test infra 부재 시 측정 X)
- **diff**: small (~30 LOC NavLinks 재배치 + a11y test)
- **fire mode**: polish-ui lite (5번째 item dropdown 분리) 또는 design-system lite (mobile touch target spacing 조정)
- **timing**: 즉시 fire 가능. 자율 영역
- **risk**: 0 (NavLinks edit small, breaking change X)

### 후보 Y — TabPFN inference layer 박제 (P 후속 Step 3 user-domain wait)

- **현황 측정**: cycle 1130 PR #1525 TabPFN CSV pipeline (scripts/export-predictions-tabpfn.ts + lib + 21 unit test + 18 column schema) body 박제. Step 3 = user-domain TabPFN inference Python script 실행 → output CSV 읽기 → DEFAULT_WEIGHTS shadow layer 박제. **사용자 결정 wait** (TabPFN Python 환경 결정 + GPU 사용 / inference frequency 등)
- **scope**: 사용자 결정 후 fire 가능 layer 박제 (TabPFN output CSV reader + shadow weight 박제 layer + /accuracy/shadow TabPFN series 추가). body 박제 자체는 본 메인 자율 가능
- **ROI**: 중 (TabPFN inference vs production v1.8 + v2.1-B-shadow 비교 가시화). 사용자 영역 wait 부분 제외 시 body 박제 즉시 fire 가능
- **diff**: medium (~150 LOC reader + lib + UI series 추가). 사용자 결정 후 ~50 LOC Python inference 박제 wait
- **fire mode**: explore-idea heavy (body 박제 + UI series 추가) 또는 lite (spec body only)
- **timing**: P 후속, 즉시 fire 가능 (사용자 결정 wait 부분 분리)
- **risk**: 1 (TabPFN output CSV schema 변동 시 reader silent fail risk, schema validation layer 필수)

### 후보 Z — runtime smoke route coverage 확장 (plan #13 step 4-5 carry-over)

- **현황 측정**: plan #13 = 비상 관리 도구 강화 (runtime smoke route coverage 확장 + 운영 alert 추가, scout #1327 carry-over). status `tier_1_shipped_pending_user_step_4_5` — Tier 1 shipped cycle 1015, step 4-5 (사용자 결정 wait). 본 메인 자율 가능 layer = 추가 runtime smoke endpoint 박제 (cron silent skip detection 강화)
- **scope**: 추가 runtime smoke route 박제 (예: /api/cron/postview-daily / /api/cron/v2-shadow-weights / /api/cron/silent-drift-alert smoke endpoint). 운영 alert mapping 자율 가능
- **ROI**: 중 (사례 9 family silent drift 14건 evidence 후속, cron silent skip detection 강화)
- **diff**: small~medium (~80 LOC smoke endpoint + Sentry warning channel 매핑)
- **fire mode**: explore-idea heavy (smoke endpoint 박제) 또는 fix-incident lite (silent drift family 자연 발견 시)
- **timing**: 즉시 fire 가능. plan #13 step 4-5 사용자 영역과 별도 자율 layer
- **risk**: 1 (smoke endpoint 추가 시 cron schedule 충돌 risk, schedule audit 필수)

## v18 inventory ROI 우선순위 평가

| 후보 | ROI | 자율 가능 | risk | 의존성 | Tier | 우선순위 |
|---|---|---|---|---|---|---|
| U silent drift family 20 lazy | 중 | partial (자연 발견) | 0 | review-code heavy | 3 | 자연 발견 시 (lazy) |
| V CalibrationPlot v2.1-B 자동 활성 + Platt scaling | 중 | yes | 1 | n=100+ v2.1-B (velocity 0 stale) | 2 | pre-cohort 박제 시 fire (lite) 또는 n 도달 시 fire (heavy) |
| W MLB cohort scraping spec body | 낮~중 | yes | 0 | none (spec body only) | 1 | 즉시 fire 가능 (small) |
| X Header utility nav 5번째 dropdown 분리 | 낮 | yes | 0 | none | 1 | 즉시 fire 가능 (small) |
| Y TabPFN inference layer body 박제 | 중 | yes | 1 | Step 3 user-domain wait (body 박제 별도) | 2 | 즉시 fire 가능 (heavy body) |
| Z runtime smoke route 확장 | 중 | yes | 1 | none (plan #13 step 4-5 별도 layer) | 2 | 즉시 fire 가능 (medium) |

## 본 spec 결정

- **lite spec write only** — 자율 영역 신규 ship X (carry-over inventory cataloging). v17 candidate T silent closure 발견 박제
- **다음 cycle next_recommended** = explore-idea (heavy, 후보 Y TabPFN inference layer body 박제 medium) 또는 explore-idea (lite, 후보 W MLB cohort scraping spec body 자율 small) 또는 explore-idea (lite, 후보 X Header dropdown 분리 small) 또는 explore-idea (heavy, 후보 Z runtime smoke route 확장 medium) 또는 review-code (lite/heavy, family 20 자연 발견 시) 또는 op-analysis (gap=8, +17 cycle 후 trigger 7 25-cycle 충족 cycle 1148 ETA) 또는 fix-incident (gap=3, trigger 7 20-cycle gap=17 미충족 → 자연 발화 X) 또는 info-arch (gap=10, trigger 9 30-cycle gap=20 미충족) 또는 lotto (gap=26, trigger 6 30-cycle gap=4 미충족, 4 cycle 후 자연 fire)
- **자율 vs 사용자 영역 비율**: 자율 = 후보 U/V/W/X/Y/Z (6) / 사용자 영역 = 없음 (S 가 W 안 spec body 박제 부분 자율, 코드 fire 부분만 사용자 결정) — v17 대비 자율 candidate 동일 6개 유지. 자율 영역 → 사용자 영역 비율 6:0 (v17 6:1 → v18 6:0) 자연 redirect 정합 (plan ship saturation 후 다음 layer 자율 fire opportunity ↑ 지속, 사용자 영역 candidate W 안 흡수)
- **silent drift family wave 18 self-monitoring**: review-code heavy detection channel 안 family 20 자연 발견 wait. wave 17 cycle 1067-1099 PRODUCTION_COHORT_RULES filter 7 wave self-closure 패턴 정합. 본 cycle silent closure (candidate T) 발견 = self-monitoring positive signal (spec body cataloging stale 자연 detection)

## 자가 검증 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  candidate_U_silent_drift_family_20:
    가치: medium (silent drift family wave 18 자연 detection channel 활성)
    시간_비용: lazy (자연 발견 시 ≤80 LOC fix)
    risk: 0 (lazy fix, detection channel 안정)
    자율_가능: partial (자연 발견 review-code heavy)
    의존성: review-code heavy 자연 fire (cycle 1118 last, gap=13)
    tier: 3 (자연 발견 시)
  candidate_V_calibration_v21b_auto_activate:
    가치: medium (v2.0 가중치 결정 evidence visual 강화)
    시간_비용: medium (~150 LOC CalibrationPlot edit + ~100 LOC Platt scaling lib)
    risk: 1 (UI 변경 light, data 도달 시 silent fail risk)
    자율_가능: yes
    의존성: n=100+ v2.1-B (velocity 0 stale, ETA 무한)
    tier: 2 (medium + 의존성 wait, pre-cohort 박제 lite fire 가능)
  candidate_W_mlb_cohort_scraping_spec_body:
    가치: low~medium (spec body 박제 자체 가시 영향 X, 사용자 결정 후 fire layer 비용 절감)
    시간_비용: small (~100 LOC spec body)
    risk: 0 (spec body, 코드 변경 X)
    자율_가능: yes (body 박제 only)
    의존성: none
    tier: 1 (small + light, 즉시 fire)
  candidate_X_header_dropdown_split:
    가치: low (사용자 가시 polish 미세, 측정 infra 부재)
    시간_비용: small (~30 LOC NavLinks 재배치 + a11y test)
    risk: 0 (NavLinks edit small)
    자율_가능: yes
    의존성: none
    tier: 1 (small + light, 즉시 fire)
  candidate_Y_tabpfn_inference_layer_body:
    가치: medium (TabPFN inference vs production 비교 가시화)
    시간_비용: medium (~150 LOC reader + lib + UI series)
    risk: 1 (TabPFN output CSV schema validation 필수)
    자율_가능: yes (body 박제, 사용자 Python 환경 결정 wait 분리)
    의존성: Step 3 user-domain wait (body 박제 별도)
    tier: 2 (medium + 자가 검증 후)
  candidate_Z_runtime_smoke_route_expansion:
    가치: medium (사례 9 family silent drift detection 강화)
    시간_비용: small~medium (~80 LOC smoke endpoint + Sentry mapping)
    risk: 1 (cron schedule 충돌 audit 필수)
    자율_가능: yes
    의존성: none (plan #13 step 4-5 별도 layer)
    tier: 2 (medium + 자가 검증 후)
  baseline_v17_closure:
    candidates_closed: ["N feature flag Tier 2 PR #1523", "O Header utility nav PR #1524", "P TabPFN CSV pipeline body PR #1525"]
    candidates_silent_closed: ["T debate/postview Tier 2 = cycle 1127 N 안 통합 처리"]
    candidates_lazy: ["R silent drift family 19 (cycle 1124 audit real drop X)"]
    candidates_wait_dependency: ["Q CalibrationPlot v2.1-B 자동 활성 (n=100+ velocity 0 stale)"]
    candidates_wait_user: ["S MLB cohort scraping"]
  baseline_brier_v1_8_real: 0.2416 (cycle 1098 → cycle 1123 변동 0, real n=42 stale)
  baseline_brier_v2_1_B_shadow: 0.4635 stale (cycle 1098 25 cycle 이전, fresh 측정 wait)
  baseline_accuracy_v1_8_real: 57.1% (cycle 1098 → cycle 1123 변동 0)
  v1_8_velocity: 0/day (25 cycle 변동 X, cycle 1124 audit real drop X 결론)
  next_milestone_v2_0_decision: n=150 도달 (ETA 무한, velocity 0)
  next_milestone_calibration_audit: n=100+ v2.1-B (ETA 무한, velocity 0)
  next_milestone_op_analysis_trigger_7: cycle 1148 (gap=25, +17 cycle 후)
  next_milestone_lotto_trigger_6: cycle 1135 (gap=30, +4 cycle 후 자연 fire)
  saturation_series_progression: v10 → v11 → v12 → v13 → v14 → v15 → v16 → v17 → v18 (8-step series, 약 10 cycle 간격, cycle 1126 v17 → cycle 1131 v18 5 cycle 간격 단축)
```

## skill-evolution 평가 (자가 의심 차단)

- cycle 1131 % 50 ≠ 0 (trigger 3 X — next milestone cycle 1150)
- chain-evolution subtype 누적 ≥ 5 = 별도 git history 측정 필요 (지금 trigger X 가정, cycle 1100 milestone 박제 후 누적 정상)
- 같은 chain 5회 연속 fail = X (explore-idea last 5 = 1122/1125/1126/1127/1129/1130 6/6 success)
- chain pool 0회 발화 chain (trigger 5) = polish-ui (영구 opt-out cycle 825 박제) / dimension-cycle (구조적 opt-out) / expand-scope (희귀 조건 opt-out) / design-system (희귀 조건 opt-out) / operational-analysis (자체 trigger 7 25-cycle gap 보유) / fix-incident (자체 trigger 7 20-cycle gap 보유) / info-architecture-review (자체 trigger 9 30-cycle gap 보유) / explore-idea (자체 saturation trigger 보유) / lotto (자체 trigger 6 30-cycle gap 보유) — 9 영구 opt-out + review-code 1 평가 대상. review-code 직전 20 cycle = 6회 fire (5%/20=30%), 0회 발화 미충족
- meta-pattern "SKILL 갱신 필요" 명시 = X

→ **skill-evolution trigger 5종 모두 미충족** = 정상 진행 (signal next_n=10 박제 후 watch.sh zero-touch fire).

## carry-over 다음 cycle

- next_recommended_chain = explore-idea (heavy, 후보 Y TabPFN inference layer body 박제 medium Tier 2) 또는 explore-idea (lite, 후보 W MLB cohort scraping spec body 자율 small Tier 1) 또는 explore-idea (lite, 후보 X Header dropdown 분리 small Tier 1) 또는 explore-idea (heavy, 후보 Z runtime smoke route 확장 medium Tier 2) 또는 review-code (lite/heavy, family 20 자연 발견 시)
- skill-evolution-pending marker = 박제 X
- silent drift family wave 18 self-monitoring 지속 (review-code heavy detection channel)
- v17 candidate T silent closure 발견 = self-monitoring positive signal 박제 (spec body cataloging stale 자연 detection)

# cycle 1102 explore-idea v15 — 사례 17 family closure + plan #18~21 자율 영역 풀-수렴 후 redirect source 인벤토리

- **mode**: lite (spec write only, partial outcome — 사용자 review 대기)
- **carry-over**: 사례 17 PRODUCTION_COHORT_RULES family wave 17 후보 0건 자연 closure (cycle 1099) + plan #18~21 자율 영역 4 ship 완료 (cycle 1039/1042-1046/1064/1092-1094) + v1.8 cohort real n=42 +12.7pp (cycle 1098) + cycle 1100 milestone metric-only baseline (44th 자가 진화 cycle 1101)
- **chain reason**: improvement saturation trigger 14/15 충족 (review-code 11 + fix-incident 2 + info-arch 1 in cycle 1082~1101 window) — 신규 product direction 점검 신호 자연 fire. lite = spec write only (auto-fire env `/office-hours` AskUserQuestion hang 회피, v13/v12 패턴 정합)
- **last saturation series**: v13 (cycle 798, 2026-05-21) → v14 잔여 spec 부재 추정 (v13 series 종결 후 cycle 825 polish-ui 영구 opt-out + cycle 851~ milestone metric-only 9 consecutive)
- **v15 자연 redirect**: phase 11 까지 silent drift family sweep dominance (review-code 44% / cycle 1067~1099 wave 11~17) + plan ship 풀-수렴 → 신규 source = (1) 모델 v2.0 path 가속 후속 evidence 강화 (2) Brier calibration 약점 + 요일 약점 (3) AdSense / 사용자 가시 trust 강화 (4) MLB league scout #1206 carry-over 후속 (사용자 영역)

## phase 11 (cycle 1051~1100) ship 종합 박제

### 자율 영역 풀-수렴 ship 4건

| plan | scope | status | 후속 의존성 |
|---|---|---|---|
| #19 | a11y MegaMenu Phase 2-4 (Header utility nav / 키보드 nav / 모바일 menu / hreflang) | all_steps_shipped cycle 1042-1046 | 자율 완료 |
| #20 | KBO real-time | all_steps_shipped cycle 1064 | 사용자 smoke 대기 |
| #21 Step 1-3 | MLB /mlb/players/[id] Statcast / Header utility nav / robots disallow / E2E hreflang | step_3_shipped cycle 1092-1094 | Step 4 mirror 9 page 사용자 영역 |
| #18 | mobile UX | doc_only_shipped cycle 1039 | 사용자 step B 대기 |

### 사례 17 family closure (silent drift family 17번째 layer)

- wave 11~14 (cycle 1067-1083): PRODUCTION_COHORT_RULES filter 누락 초기 fix
- wave 15 (cycle 1096): /calendar L133 fix (PR #1496)
- wave 16 (cycle 1097): factor-bias-bootstrap-ci.ts ship 잔여 fix (PR #1497)
- wave 17 (cycle 1099): "후보 0건" family 자연 closure

→ silent drift family sweep source 자연 마름. review-code dominance 자연 redirect 압력 ↑.

### v1.8 cohort 진척 (cycle 1098 op-analysis)

- cycle 989 baseline n=27 → cycle 1098 n=42 (+15건 / +12.7pp acc 44.4% → 57.1% / Brier 0.2487 → 0.2416)
- ETA 2주 단축: 2026-08-04 → 2026-07-22 (잔여 108건 / velocity 3.0/day)

## v15 신규 redirect source 인벤토리

### 후보 A — v1.6 anomaly investigation (cycle 387 발견 후 cycle 1102 carry-over 685일 미해소)

- **현황 측정**: TODOS.md L40 — v1.6 scoring_rule n=46 (2026-04-22~05-03) 17/46 = **37.0%** (coinflip 13pp 이하). high conf 35.7% / low conf 37.5% 양쪽 random 이하 = v1.6 가중치 자체 역방향 신호 가능성. n=150+ 도달 후 op-analysis heavy era별 factor backtest 권장 박제
- **scope**: v2.0 path n=150 도달 (ETA 2026-07-22) 시점 후속 — operational-analysis heavy chain dispatch. era별 factor backtest harness 실행 (cycle 890 plan #9 Step 2 backtest harness 참조). v1.6 era n=46 → factor 별 winner 정합 측정 → 역방향 factor 식별 (sp_fip 15% / lineup_woba 15% 후보 의심)
- **ROI**: 중상 — v2.0 가중치 결정 evidence 강화 / 모델 진화 narrative (사용자 가시 신뢰 ↑)
- **fire mode**: operational-analysis heavy (n=150 도달 후 자연 fire 권장, 본 spec carry-over 만)
- **timing**: 2026-07-22 ETA — 본 cycle 자율 영역 X

### 후보 B — Brier calibration v2.0-shadow / v2.1-B-shadow 약점 audit (cycle 1098 박제)

- **현황 측정**: TODOS.md L11 — v2.0-shadow n=5 (60.0%, Brier 0.5616) / v2.1-B-shadow n=52 (51.9%, **Brier 0.4635** — calibration 미흡 surface). v1.8 real (Brier 0.2416) 대비 약 2배 worse
- **scope**: v2.1-B-shadow 가중치 재계산 path — 현 가중치 + Platt scaling 또는 isotonic regression calibration 박제. shadow predict 신규 시점부터 calibration 적용 cohort 누적. v2.0-shadow n=5 표본 부족 stop
- **ROI**: 중 — v2.0 가중치 후보 평가 evidence 정확성 ↑. 단 본 메인 자율 fire 가능 (코드 변경 medium scope)
- **fire mode**: explore-idea heavy (1 cycle ship) 또는 operational-analysis heavy
- **timing**: n=100+ v2.1-B-shadow 누적 (현 n=52) 후 또는 신규 calibration 박제 cycle

### 후보 C — 요일 weak signal cap UI / 모델 강화

- **현황 측정**: TODOS.md L13 — 일 41.4%/n=29 + 목 50.6%/n=77 (목 max sample, 약 random). cycle 309/358 Sunday confidence cap 0.45 박제 완료. 목요일 cap 박제 X
- **scope**: judge-agent.ts Thursday confidence cap (현 Sunday cap 0.45 패턴 재사용) 또는 day-of-week factor weight adjustment. n=77 충분 (Sunday n=29 cap GO 정합 표본 ↑)
- **ROI**: 중 — 모델 accuracy 직접 영향 (목 random → cap 후 silent 시그널 감소). 단 위험 = small sample noise 가능성 (목 50.6% = random ± noise band 안 가능)
- **fire mode**: explore-idea heavy (1 cycle ship) — `judge-agent.ts` confidence_clamp 추가
- **timing**: 즉시 fire 가능. 단 사용자 결정 prefer (모델 변경 risk)

### 후보 D — `/mlb/factors` Step 4 사용자 영역 후속 자연 fire wait

- **현황 측정**: plan #21 Step 4 status = step_3_shipped_cycle_1094 / Step 4 = placeholder 영문 mirror 9 page (Vercel Edge Config slot + AdSense reject 0 = 사용자 영역)
- **scope**: 사용자 영역 — 본 메인 자율 X
- **fire mode**: 사용자 결정 후 자연 fire (carry-over 채널만)
- **timing**: 사용자 결정 wait

### 후보 E — `apps/moneyball/data/v2-shadow-monitor/` UI dashboard

- **현황 측정**: v2.0-shadow / v2.1-B-shadow / v2.1-debate 등 shadow cohort 박제 dir 존재. 사용자 가시 dashboard 부재 (raw md 파일만)
- **scope**: `/v2-shadow-monitor/page.tsx` 신규 — fs.readFile data/v2-shadow-monitor/<latest>.md + remark/markdown render. 모델 진화 narrative 강화. Header / Footer 진입 path 추가
- **ROI**: 중 — AdSense trust signal + LLM scraper context (모델 진화 transparent narrative) + power user 가치
- **diff**: 1 신규 page + Footer 1 column 갱신 = 2 파일
- **fire mode**: explore-idea heavy (1 cycle ship)
- **timing**: 즉시 fire 가능. v15 series 안 가장 자율 영역 + ROI 균형

### 후보 F — MLB scout #1206 TabPFN PoC 사용자 영역 wait

- **현황 측정**: GH issue #1206 OPEN / TabPFN scout (외부 dependency Python ML 라이브러리). 사용자 영역 (env install / GPU resource / 결제 가능성)
- **scope**: 사용자 영역 — 본 메인 자율 X
- **fire mode**: 사용자 결정 후 자연 fire
- **timing**: 사용자 결정 wait

### 후보 G — silent drift family 18 family 신규 source 발견 검토 (carry-over)

- **현황 측정**: 사례 17 wave 17 closure 후 새 family source 발견 path 미박제 (R5 메타 패턴 evidence 매 fix 가 다음 layer 노출). 가능 후속 source = (a) 사례 15 silent retro drift family alert channel root cause (cycle 900/1023/1050 박제 후 미해소) (b) Vercel 자동 배포 race 신규 layer (c) Sentry alert channel rollout coverage gap
- **scope**: review-code heavy 가 자연 source 발견 시 신규 family 박제. 본 spec 안 명시 trigger X (lazy detection)
- **fire mode**: review-code heavy 자연 fire 시
- **timing**: 자연 발견 시

## v15 inventory ROI 우선순위 평가

| 후보 | ROI | 자율 가능 | risk | 의존성 | Tier | 우선순위 |
|---|---|---|---|---|---|---|
| A v1.6 anomaly | 중상 | partial (n=150 후) | 0 | n=150 도달 | 3 | 보류 (2026-07-22 ETA) |
| B Brier calibration audit | 중 | yes | 1 (구현 risk medium) | n=100+ v2.1-B | 2 | 후속 carry-over |
| C 요일 cap (목) | 중 | yes | 2 (모델 risk + small sample) | 사용자 결정 | 3 | 사용자 결정 wait |
| D /mlb/factors Step 4 | n/a | no (사용자 영역) | n/a | 사용자 결정 | 4 | wait |
| E v2-shadow-monitor dashboard | 중 | yes | 0 | none | 1 | **본 spec 후속 즉시 fire 권장** |
| F TabPFN PoC | n/a | no | n/a | 사용자 결정 | 4 | wait |
| G silent drift family 18 | 중 | partial (자연 발견) | 0 | review-code heavy | 3 | 자연 발견 시 |

## 본 spec 결정

- **lite spec write only** — 자율 영역 신규 ship X (carry-over inventory cataloging)
- **다음 cycle next_recommended** = explore-idea (heavy, 후보 E /v2-shadow-monitor dashboard 박제) 또는 review-code (lite, family 18 자연 source scan) 또는 사용자 영역 wait
- **자율 vs 사용자 영역 비율**: 자율 = 후보 B/E/G (3) / 사용자 영역 = A/C/D/F (4) — 자율 영역 풀-수렴 후 사용자 영역 의존성 ↑ 자연 (plan ship saturation 정합)

## 자가 검증 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  candidate_E_v2_shadow_monitor_dashboard:
    가치: medium (AdSense trust + LLM scraper + power user)
    시간_비용: small (1 cycle ship 2 파일)
    risk: 0 (사용자 가시 read-only dashboard, 모델 변경 X)
    자율_가능: yes
    의존성: none
    tier: 1 (small + light, 즉시 fire)
  candidate_B_brier_calibration:
    가치: medium (v2.0 가중치 결정 evidence ↑)
    시간_비용: medium (Platt/isotonic 구현 + cohort 누적)
    risk: 1 (구현 risk)
    자율_가능: yes
    의존성: n=100+ v2.1-B 누적
    tier: 2 (medium + 자가 검증 후)
  candidate_C_thursday_cap:
    가치: medium (목 random → cap 후 신호 감소)
    시간_비용: small (judge-agent.ts confidence_clamp 추가)
    risk: 2 (모델 변경 + n=77 small sample noise band)
    자율_가능: yes
    의존성: 사용자 결정 prefer
    tier: 3 (large risk → 사용자 결정 wait)
  baseline_brier_v1_8_real: 0.2416 (cycle 1098 n=42)
  baseline_brier_v2_1_B_shadow: 0.4635 (cycle 1098 n=52)
  baseline_accuracy_v1_8_real: 57.1% (cycle 1098 n=42)
  next_milestone_v2_0_decision: n=150 도달 (ETA 2026-07-22, 잔여 108건)
```

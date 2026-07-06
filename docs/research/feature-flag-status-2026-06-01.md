---
created_at: 2026-06-01
cycle: 1091
scout_issue: 1370
related_plan: 17
status: superseded — v1.8 유지 확정 (cycle 1460, 2026-07-06). n=150 gating condition crossed (cycle 1447 n=161) but upgrade decision = 불필요 (Brier diff < 1pp). plan #17 feature flag = v2.0 upgrade 불필요로 인해 종료.
prior_doc: docs/research/feature-flag-status-2026-05-31.md (cycle 1072, gap=19)
---

# 기능 플래그 도입 Scout #1370 — Status Refresh (cycle 1091)

scout #1370 carry-over status — cycle 1072 박제 후 19 cycle 경과 (2026-05-31 → 2026-06-01). 본 doc = 19-cycle gap refresh + cycle 1079 kill-switch eval 정합 + AdSense monitor D-4 박제.

## 1. cycle 1072 박제 후 변경 사항 (19 cycle / 1일)

### 1.1 cycle 1079 v1.8 kill-switch evaluation (PR #1481)

cycle 1079 op-analysis (lite) 결과 (`docs/research/v1.8-killswitch-evaluation-2026-06-01.md`):

- 측정 baseline: n=220 total (+15 vs cycle 1061), v1.8 real n=67 acc 58.2%
- **criterion #1 (n≥60) PASSED** — real n=67, threshold 도달
- criterion #2 (-2pp 하회) — v2.0-shadow n=5 too small, evaluation 불가
- criterion #3 (3 consecutive) — n=1 미달
- **kill-switch fire X** — v1.8 production rule 유지
- v1.8 main acc 44.4→57.1 (+12.7pp 회복, cycle 1061 -11.5pp 누적 RESET 부호 반전)

~~본 측정 = feature flag layer 박제 ROI 평가 input. kill-switch fire X = v2.0 ship 시점 빠른 도래 evidence 없음. n=150 ETA 보수 추정 ~2026-07-17 (velocity 1.80/day, +40/3일 effect 미확정).~~ **cycle 1460 갱신: v1.8 유지 확정 (n=161 crossed, Brier < 1pp) — feature flag ROI 소멸, ETA 무의미**

### 1.2 AdSense monitor 진척 (D-4)

cycle 1072 시점 = D-5 (06-05 까지 5일 잔여). 본 cycle 1091 시점 = **D-4** (06-05 까지 4일 잔여).

AdSense reject signal 간접 evidence (cycle 1090 IA 진단 inline):
- Vercel production deploys: 정상 (recent PR #1481/#1486/#1487/#1488/#1489 모두 Ready)
- robots.ts AdSense crawler block intact (Mediapartners-Google + AdsBot-Google `/lotto` + `/lotto/archive` Disallow 명시)
- 코드 reject signal: 0건

직접 확인 = 사용자 Google AdSense policy center UI (자율 X). reject 0 통과 → plan #6/#7 Step C/D unlock (`/lotto` hub + UI 강화). reject 발생 → plan #6/#7 + robots.ts rollback.

### 1.3 develop-cycle 자가 진화 진척 (cycle 1072 → 1091)

- cycle 1072~1090 = 19 cycle ROI evidence: SUCCESS 16건 + PARTIAL 3건 (1078/1083/1090) + FAIL 0건
- review-code dominance: 13/20 = 65% (silent drift family wave 12~14 sweep)
- silent drift family streak ~568 cycle (cycle 458 → 1090) — feature flag system 미보유 상태에서도 자가 진화 layer 작동 evidence 누적
- cycle 1089 wave 14 ship: silent drift family 사례 17 family 3 후보 ship (live.ts preGame + retro updateCalibration/generateAgentMemories `.in('scoring_rule', PRODUCTION_COHORT_RULES)` 필터 추가) — production cohort filter pattern 정착

본 evidence = 사용자 결정 시점 (Vercel Edge Config slot 박제 GO) 활용 가능.

## 2. 자율 영역 evidence pack (사용자 결정 GO 시 즉시 가용)

### 2.1 Step A 자율 영역 (사용자 Vercel Edge Config slot 박제 후)

cycle 1032 plan #17 PoC scope 5 sub-step (`docs/decisions/feature-flag-poc-scope.md`):

1. `pnpm add @vercel/flags @vercel/edge-config` (apps/moneyball)
2. `apps/moneyball/src/lib/flags.ts` 신규 — `getFeatureFlag(slug)` wrapper
3. PoC slug 2개: `model-version-v20-rollout` (number 0~100 percentage) + `lotto-hub-published` (boolean)
4. smoke test: `apps/moneyball/src/lib/__tests__/flags.test.ts`
5. ship PR + R7 머지

본 5 step = 본 메인 자율 fire 가능. 사용자 1회 GO 필요.

### 2.2 v2.0 ship 결정 시점 정합

~~v2.0 ship 결정 = (a) v1.8 cohort n=150 도달 (ETA ~2026-07-17 보수, 잔여 ~46일 / velocity 1.80/day) **또는** (b) kill-switch fire 중 빠른 시점.~~

~~cycle 1079 측정 결과 kill-switch fire X + v1.8 main +1.2pp 우위 = (b) 빠른 도래 가능성 ↓. (a) n=150 도달 이 우선 trigger 가능성 ↑.~~

**cycle 1460 갱신 (2026-07-06)**: v1.8 유지 확정 (Brier diff < 1pp, n=161 crossed 후 upgrade 불필요 결론). v2.0 ship 시점 자체 소멸 — 본 섹션 무효화, feature flag 박제 ROI 소멸.

~~feature flag layer 박제 = v2.0 ship 시점 canary 10%/50% gradual rollout 가능. 미박제 시 = 0%→100% binary switch (현 상태).~~

**self_verification (cycle 887 plan #8 5축 rubric, 정합 유지)**:
- 가치: medium — v2.0 ship 시점 binary switch 위험 mitigation
- 시간 비용: small — 5 step PoC = 1 cycle 안 자율 fire 가능
- risk: 1 (light noise) — Edge Config read 월 $1.5 cost
- 자율 가능: partial — Vercel Edge Config slot 생성 = 사용자 영역, SDK wire = 본 메인 자율
- 의존성: 단일 (v2.0 ship 결정 시점 또는 kill-switch fire 둘 중 하나)

Tier 2 = 자가 검증 후 fire 가능 (사용자 GO 후). 즉시 자율 X.

## 3. 본 cycle 결정 (explore-idea lite refresh)

- 본 메인 자율 fire X — 사용자 결정 영역 동일 (cycle 1072 박제 정합)
- 본 doc = 19-cycle gap status refresh + AdSense monitor D-4 박제 + cycle 1079 kill-switch eval 정합
- 신규 코드 / 신규 plan slot 박제 X
- carry-over status 채널 유지 (issue #1370 close X)

## 4. 다음 refresh trigger

- **AdSense reject monitor 결과 도래 (~2026-06-05) → reject 0 통과 시 plan #6/#7 Step C/D unlock 자율 영역 진입** → 본 doc 추가 refresh (D-Day refresh)
- ~~v2.0 ship 결정 시점 → 사용자 Vercel Edge Config slot 박제 → Step A 5 step 자율 fire → 본 doc final closure~~ **cycle 1460 갱신: v1.8 유지 확정 (Brier < 1pp) — v2.0 ship 시점 소멸, 본 refresh trigger 무효화**
- 사용자 자연 발화 ("feature flag" / "기능 플래그" / "canary" / "shadow rollout") → 본 doc evidence 안내
- 자연 누적 (15+ cycle gap 재도래) → 다음 status refresh

## 5. 참조

- prior doc: `docs/research/feature-flag-status-2026-05-31.md` (cycle 1072)
- plan #17 PoC scope: `docs/decisions/feature-flag-poc-scope.md` (cycle 1032)
- v1.8 kill-switch eval: `docs/research/v1.8-killswitch-evaluation-2026-06-01.md` (cycle 1079)
- v1.8 cohort baseline: `docs/research/v1.8-cohort-2026-06-01-cycle-1079.md`
- AdSense monitor window: 2026-05-22 ~ 06-05 (`TODOS.md` lotto plan #6/7 carry-over 항목 3)

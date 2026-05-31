---
created_at: 2026-05-31
cycle: 1072
scout_issue: 1370
related_plan: 17
status: carry-over scout (v2.0 ship gating wait + AdSense monitor D-5)
prior_doc: docs/research/feature-flag-status-2026-05-29.md (cycle 1052)
---

# 기능 플래그 도입 Scout #1370 — Status Refresh (cycle 1072)

scout #1370 (2026-05-28 박제) carry-over status — cycle 1052 박제 후 20 cycle 경과 (2026-05-29 → 2026-05-31). 본 doc = 20-cycle gap refresh + plan #17 PoC scope 정합 + AdSense monitor 잔여 D-5 박제.

## 1. cycle 1052 박제 후 변경 사항 (3일)

### 1.1 plan #17 PoC scope 박제 (cycle 1032)

cycle 1032 본 메인이 plan #17 (Vercel Flags SDK + Edge Config 통합 PoC) doc-only ship. status = `doc_only_shipped_cycle_1032_pending_user_step_a`.

- 1-pager: `docs/decisions/feature-flag-poc-scope.md` (cycle 1032)
- 권장 3 option: (A) Vercel Flags SDK + Edge Config / (B) PostHog feature flags / (C) Unleash self-hosted
- 1순위 = (A) Vercel Flags SDK + Edge Config (인프라 정합)
- Step A gating = 사용자 Vercel Edge Config slot 생성 + `EDGE_CONFIG` env 박제 (자율 X)
- Step A unlock 시점 = 본 메인 자율 SDK 통합 + 코드 wire (5 sub-step PoC)

본 plan = cycle 1052 doc 와 정합 (사용자 결정 wait 동일). 차이 = cycle 1032 가 doc + scope + cost 박제 명확화 (월 ~$1.5 Edge Config read pricing).

### 1.2 AdSense monitor 진척 (D-5)

cycle 1052 시점 = AdSense reject signal 14일 monitor 윈도우 시작 (2026-05-22 ~ 06-05). cycle 1072 시점 = D-5 (06-05 까지 5일 잔여).

AdSense reject signal 간접 evidence (cycle 1070 inline 검토):
- Vercel production deploys: 4건 Ready (recent PR #1451/#1452/#1453/#1454 모두 정상)
- robots.ts AdSense crawler block intact (Mediapartners-Google + AdsBot-Google `/lotto` + `/lotto/archive` Disallow 명시)
- 코드 reject signal: 0건

직접 확인 = 사용자 Google AdSense policy center UI (자율 X). reject 0 통과 → plan #6/#7 Step C/D unlock (`/lotto` hub + UI 강화). reject 발생 → plan #6/#7 + robots.ts rollback.

### 1.3 develop-cycle 자가 진화 진척 (cycle 1052 → 1072)

- cycle 1051 = skill-evolution 43회째 (cycle 1050 milestone trigger 3)
- cycle 1052~1071 = 20 cycle SUCCESS streak (1063 PARTIAL 1건 / 1070-71 SUCCESS recovery)
- review-code 3연속 SUCCESS streak (1069/1070/1071) — silent drift family sweep dominance channel
- silent drift family streak ~548 cycle (cycle 458 → 1071)

본 metric = feature flag system 미보유 상태에서도 자가 진화 layer 작동 evidence 누적. 사용자 결정 시점에 본 evidence pack 활용.

## 2. 자율 영역 evidence pack (사용자 결정 GO 시 즉시 가용)

### 2.1 Step A 자율 영역 (사용자 Vercel Edge Config slot 박제 후)

cycle 1032 plan #17 PoC scope 5 sub-step:
1. `pnpm add @vercel/flags @vercel/edge-config` (apps/moneyball)
2. `apps/moneyball/src/lib/flags.ts` 신규 — `getFeatureFlag(slug)` wrapper
3. PoC slug 2개: `model-version-v20-rollout` (number 0~100 percentage) + `lotto-hub-published` (boolean)
4. smoke test: `apps/moneyball/src/lib/__tests__/flags.test.ts`
5. ship PR + R7 머지

본 5 step = 본 메인 자율 fire 가능. 사용자 1회 GO 필요.

### 2.2 v2.0 ship 결정 시점 정합

v2.0 ship 결정 = (a) v1.8 cohort n=150 도달 (ETA 2026-08-04, 잔여 ~64일 / velocity 1.80/day) **또는** (b) kill-switch fire (ETA 2026-06-15) 중 빠른 시점.

feature flag layer 박제 = v2.0 ship 시점 canary 10%/50% gradual rollout 가능. 미박제 시 = 0%→100% binary switch (현 상태).

**self_verification (cycle 887 plan #8 5축 rubric)**:
- 가치: medium — v2.0 ship 시점 binary switch 위험 mitigation
- 시간 비용: small — 5 step PoC = 1 cycle 안 자율 fire 가능
- risk: 1 (light noise) — Edge Config read 월 $1.5 cost
- 자율 가능: partial — Vercel Edge Config slot 생성 = 사용자 영역, SDK wire = 본 메인 자율
- 의존성: 단일 (v2.0 ship 결정 시점 또는 kill-switch fire 둘 중 하나)

Tier 2 = 자가 검증 후 fire 가능 (사용자 GO 후). 즉시 자율 X.

## 3. 본 cycle 결정 (explore-idea lite refresh)

- 본 메인 자율 fire X — 사용자 결정 영역 동일 (cycle 1052 박제 정합)
- 본 doc = 20-cycle gap status refresh + AdSense monitor D-5 박제 + plan #17 PoC scope 정합 evidence
- 신규 코드 / 신규 plan slot 박제 X
- carry-over status 채널 유지 (issue #1370 close X)

## 4. 다음 refresh trigger

- AdSense reject monitor 결과 도래 (~2026-06-05) → reject 0 통과 시 plan #6/#7 Step C/D unlock 자율 영역 진입 → 본 doc 추가 refresh
- v2.0 ship 결정 시점 → 사용자 Vercel Edge Config slot 박제 → Step A 5 step 자율 fire → 본 doc final closure
- 사용자 자연 발화 ("feature flag" / "기능 플래그" / "canary" / "shadow rollout") → 본 doc evidence 안내
- 자연 누적 (20+ cycle gap 재도래) → 다음 status refresh

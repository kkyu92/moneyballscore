# backtest.ts 확장 + factor attribution 메타 재해석

**Cycle**: 13 (사용자 N=5 시리즈 1/5)
**Chain**: explore-idea (lite — spec md 박제, 구현은 후속)
**Date**: 2026-05-04
**Branch**: `develop-cycle/backtest-spec-meta-finding`

---

## 1. 진단 메타 발견 — cycle 11/12 결론의 missing piece

### 1.1 cycle 11/12 retro 가 carry-over 한 가설

cycle 11 (`PR #50`) 박제: `head_to_head` / `sfr` 가중치 0% factor 가 LLM postview reasoning 의 factorErrors **70% 차지** + avg_bias `-0.247 ~ -0.289` over-confidence → "**v2.0 튜닝 정량 1순위 input**" 결론.

cycle 12 (`PR #51`) actionable carry-over:
- `scripts/backtest.ts` spec brainstorm — head_to_head/sfr 가중치 0% → 5%/10% 시뮬, 30d 62 verified rows 기준 Brier 비교

cycle 12 next_recommended_chain = `explore-idea` (backtest spec).

### 1.2 본 cycle 13 발견 — 그 가설은 이미 회귀 분석으로 정량 무효 처리됨

`packages/shared/src/index.ts:75-93` 에 **이미 박제**:

```
2026-04-21 Wayback logistic 백테스트 (Train 2023 N=722 / Test 2024 N=727):
  wobaDiff*20   coef 0.548 z=2.10 ⭐ p<0.05 (유일 개별 유의)
  fipDiff/2     coef 0.301 z=0.72 borderline 양성 (방향 정확)
  sfrDiff/20    coef 0.101 z=0.37 null-like (CI [-0.44, 0.64])
  h2hShift      coef -0.009 z=-0.02 null-like (kH2h sweep monotone worsening)
  parkShift/10  coef -0.022 z=-0.13 null-like (CI [-0.34, 0.30])

조정: sfr/head_to_head/park_factor → 0 (null-like 3종 제거)
한계: Test feature 7-feature Brier 0.24661 vs 4-feature 0.24980 (Δ-0.00319, coin_flip 0.25000)
```

즉 본 3 factor 가중치 0% 는 **null-like 측정 후 의도적 0 설정**. cycle 12 retro 가 박제하려던 "5%/10% 시뮬" 의 결과가 이미 박제됨 — **null-like 재확인**.

### 1.3 추가로 `scripts/backtest.ts` 이미 존재 (드리프트 사례 1·2 패턴 재발)

cycle 11/12 retro 모두 "**작성**" 표현으로 carry-over → 그린필드 가정. 실제로는 105 줄짜리 파일이 `scripts/backtest.ts` 로 존재 — 2025 시즌 fetchGames + predict() 기반 basic accuracy 만 측정. CLAUDE.md "드리프트 사례 1·2" (구현된 코드 그린필드 간주) 의 **세 번째 인스턴스**.

---

## 2. cycle 11 finding 의 재해석

### 2.1 기존 결론 (잘못된 부분)

> head_to_head/sfr 가중치 0% factor 가 LLM reasoning 70% 차지 = **v2.0 가중치 튜닝 1순위**

이건 정량 모델 측면에선 무효 (1.2 의 회귀 결과). 5%/10% 시뮬 추가는 ROI 거의 없음 (Δ Brier ≤ 0.003).

### 2.2 진짜 finding (재해석)

> 정량 모델이 회귀 분석으로 null-like 판정한 factor 를 **LLM postview 가 추론 70% 점유율로 사용** = LLM hallucination / 가중치 무시 패턴.

이건 가중치 튜닝 문제가 아니라 **LLM prompt constraint** 문제. judge-agent.ts / postview.ts prompt 가 정량 모델의 가중치 결정 (어떤 factor 가 의미 있고 어떤 게 null-like 인지) 을 반영하지 않은 채 LLM 자율 추론 허용.

### 2.3 그래서 cycle 12 fix (`PR #51` postview factorErrors 도메인 제한) 는 이미 옳은 방향

cycle 12 가 `postview.ts` factorErrors 후보를 `DEFAULT_WEIGHTS > 0%` factor 로 제한 — 정량 모델 결정을 LLM output 에 reflect. 본 cycle 13 의 메타 재해석이 cycle 12 fix 의 정당성을 사후적으로 강화.

---

## 3. backtest.ts 확장 design (참고 — ROI 의심)

cycle 12 carry-over 의 명목 응답으로 design 박제하되, **본 cycle 의 메타 발견 후 우선순위 낮음** 명시.

### 3.1 현행

`scripts/backtest.ts` (105 줄):
- input: 2025 시즌 fetchGames + 시즌 통계 (pitcher / team / Elo)
- output: total games / accuracy / home win baseline / model vs baseline (pp)
- 한계: Brier score X / log-loss X / 가중치 시나리오 비교 X / calibration breakdown X

### 3.2 확장 후보 (구현 시 추가될 것)

```
input  추가: 가중치 시나리오 array (baseline / +h2h5% / +h2h10% / +sfr5% / +sfr10% / +both10%)
       각 시나리오는 DEFAULT_WEIGHTS 의 변형. 합계 0.85 + HOME_ADVANTAGE 0.015 보존.

logic 추가:
  - predict() 의 가중치 인자 노출 (현재 DEFAULT_WEIGHTS 하드 의존)
  - 시나리오별 predicted_winner / homeWinProb 재계산
  - Brier = (homeWinProb - actualHomeWin)^2 평균
  - log-loss
  - calibration breakdown (60%+ / 55-60% / <55%)

output 추가: docs/metrics/backtest-{date}.md 시나리오 비교 표
```

### 3.3 ROI 평가 — 낮음

- 시나리오 결과 예상: `packages/shared/src/index.ts:91-93` 의 `Δ Brier -0.00319` 재현. 의미 있는 개선 X
- 진짜 input: predictions table 의 LLM reasoning sub_prob 분석 (가중치 0% factor 의 추론 점유율 정량) — 본 backtest 외 path

cycle 14 가 explore-idea 의 구현 step 으로 본 design 진행 시 결과 박제만 가치 있음 (재확인). 신규 발견 가능성 작음.

---

## 4. 진짜 v2.0 input 후보 (cycle 14+)

본 cycle 13 메타 재해석이 시사하는 cycle 14 후보 (각각 chain 후보 표시):

### 4.1 LLM prompt constraint — judge-agent.ts / postview.ts 에 가중치 0% factor 추론 금지 (review-code 또는 fix-incident)

가장 직접적. cycle 12 PR #51 가 postview output filter 만 추가 (사후 차단). prompt 자체에 "head_to_head, park_factor, sfr 는 정량 분석 null-like 결과로 0% 가중치 — 추론에 사용 금지" 명시 → LLM 이 reasoning 에 포함시키지 않게.

산출 예상:
- `packages/kbo-data/src/agents/judge-agent.ts` SYSTEM_PROMPT 에 가중치 constraint 추가
- `packages/kbo-data/src/agents/postview.ts` prompt 에도 동일 추가
- 단위 테스트: prompt snapshot regression
- 운영 검증: cycle 11 의 7d/30d factor count 분석 재실행 → head_to_head/sfr count 감소 확인

### 4.2 factor_error_view 의 LLM hallucination 메트릭 추가 (operational-analysis)

`010_factor_error_view.sql` 에 column 추가:
- `is_zero_weight_factor BOOLEAN` — DEFAULT_WEIGHTS 0% 인지
- aggregate query 에 `zero_weight_factor_share` 추가 (0% factor / total factor 비율)

operational-analysis chain 으로 매 cycle 박제 가능 metric.

### 4.3 judge vs postview 추론 출처 분리 (review-code, cycle 11/12 retro carry-over)

`pre_game judge` 와 `post_game postview` 의 head_to_head/sfr 추론 위치 식별. 어느 쪽이 hallucination 의 주된 발생처인지 별도 측정. cycle 11 의 7d 19/12 (h2h/sfr count) 가 두 path 합산이라 분리 필요.

---

## 5. cycle 13 의 산출 = 본 spec md (구현 X)

본 cycle 의 목적은 **메타 재해석 박제** + **다음 cycle actionable 정리**. 구현 X. spec md 단일 commit.

### 5.1 commit 단위

- `docs(spec): 2026-05-04-backtest-extension-and-factor-attribution-meta.md` (본 파일)

### 5.2 PR

- branch `develop-cycle/backtest-spec-meta-finding`
- label `develop-cycle`
- R7 auto-merge (CI green 후 squash + branch delete)

### 5.3 cycle 14 진단 input (cycle 13 retro 박제)

- chain 후보 우선순위:
  1. **review-code** — 4.1 LLM prompt constraint (가장 직접적, 작은 PR)
  2. **operational-analysis** — 4.2 factor_error_view metric 확장 (정량 운영 input)
  3. **review-code** — 4.3 judge vs postview 출처 분리 (carry-over 청산)
- chain tally 13 사이클 후 (본 cycle 13 = explore-idea): review-code 6 / polish-ui 2 / fix-incident 2 / operational-analysis 2 / **explore-idea 1** / dimension-cycle 0
- 다양성: dimension-cycle 0/13 잔존. 본 backtest 확장 (3.2) 을 cycle 14 explore-idea 구현 step 으로 진행 시 chain 다양성보단 cycle 13 carry-over 청산 우선

---

## 6. 메모리 박제 후보 (선택)

- **드리프트 사례 8** (CLAUDE.md 후보) — cycle 11/12 retro carry-over 가 이미 회귀 분석으로 박제된 결과를 무시하고 backtest spec brainstorm 으로 진행. 다음 cycle 의 진단 단계가 `packages/shared/src/index.ts` DEFAULT_WEIGHTS 주석 (회귀 박제) 를 source 로 포함해야 재발 차단.
- **메모리 candidate** — `feedback_diagnose_existing_artifacts_first.md` (chain 선택 전 carry-over todo 가 가리키는 파일·주석 실제 read 필수). cycle 12 retro 의 "scripts/backtest.ts 작성" 표현이 그린필드 가정 신호 — 작성 vs 확장 vs read-first 구분.

본 메모리 박제는 본 cycle 13 PR 외 별도 commit 으로 분리 (R4 자율 commit 정책).

---

## 7. 결론

cycle 11/12 retro 가 carry-over 한 "backtest spec brainstorm — head_to_head/sfr 가중치 0% → 5%/10% 시뮬" task 는 본 cycle 13 진단 단계에서 **이미 박제된 회귀 결과 (`packages/shared/src/index.ts:75-93`)** 발견으로 정량 측면 무효 처리. 진짜 finding 은 **LLM hallucination 패턴** (정량 모델이 null-like 로 결정한 factor 를 LLM 이 70% 추론 점유율로 사용) — cycle 14+ 의 review-code chain (judge/postview prompt constraint) 우선 후보.

본 spec md = cycle 11/12 의 가설 무효화 + cycle 14 actionable 3건 정리. 구현 X. 다음 cycle 시작 시 본 md 의 §4.1 / §4.2 / §4.3 우선순위 메인 자율 추론 input.

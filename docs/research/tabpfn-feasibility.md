---
created_at: 2026-05-26
plan_n: 12
step: 1
cycle: 955
status: superseded — plan #12 Step 3-5 무기한 postpone (cycle 1460, 2026-07-06). v2.0 upgrade 불필요 결론 (Brier diff < 1pp, n=178) → v2.0 ship 시점 소멸 → Python sidecar 인프라 / TabPFN checkpoint / A/B test harness production fire 모두 무효화. 본 feasibility doc = 역사 기록으로 보존.
updated_cycle: 1473
---

# TabPFN Feasibility — KBO 승부예측 모델 후보 평가

## 1. 배경

> ⚠️ **SUPERSEDED (2026-07-06 cycle 1460)**: v1.8 유지 확정 → v2.0 후보 모델 evidence pack 목적 소멸. gating trigger (n=150 도달 = n=178 crossed cycle 1447 + v2.0 결정 = v1.8 유지) 양쪽 resolved. Step 3-5 production fire = 무기한 postpone. 아래 배경 = 역사 기록.

- **목적** (~~active~~ superseded): v1.8 (weighted-average 10팩터 sabermetric) 후 v2.0 후보 모델 evidence pack 준비.
- **trigger**: scout #1206 (2026-05-21 박제) — TabPFN foundation model 통합 가능성 carry-over.
- **gating** (resolved): v1.8 cohort `n=150` 임계 도달 (~07-05 ETA, cycle 949 op-analysis 측정) 후 v2.0 결정 시점. → n=178 도달 (cycle 1447) + v1.8 유지 확정 (cycle 1460) = 양쪽 resolved.
- **자율 영역**: research + 적합성 평가 (Step 1~2 완료). 실제 inference / 통합 / production fire = 사용자 영역 (Step 3~5, v1.8 유지 결정 이후 무기한 postpone).

## 2. TabPFN 개요

- **TabPFN** = "Tabular Prior-Fitted Network" (Hollmann et al., 2023, ICLR 2023 spotlight; v2 = Nature 2025).
- **본질**: tabular 분류 / 회귀에 prior-fitted transformer. ~1.5억 합성 dataset 사전 학습. inference 시 fine-tuning X — in-context learning 으로 한 번에 prediction.
- **공식 ref**: https://github.com/PriorLabs/TabPFN / paper arXiv:2207.01848 (v1), Nature paper 2025-01 (v2).
- **라이선스**: PriorLabs license — research/non-commercial free, commercial license 별도 (사용자 영역 결정).

## 3. KBO 데이터 적합성 — 5축 비교 표

| 축 | v1.8 weighted-average | TabPFN v2 | 결론 |
|---|---|---|---|
| **input shape** | 10 numeric factor → win prob | up to 500 features, up to 10k rows tabular | 적합 (10팩터 << 한도) |
| **train size** | n=44 cohort (39 verified) | designed for small n (n < 10k optimal) | **강점** (TabPFN small-n에 특화, KBO 표본 부족 보완) |
| **inference** | linear weighted sum (Brier 0.43~0.23) | transformer in-context (~1s per batch) | comparable latency 가능 (batch inference) |
| **interpretability** | 가중치 명시 (사용자 가시 / glossary inline) | feature importance 추출 가능하나 black-box | **약점** (current factor breakdown UI surface 호환성 약함) |
| **infra** | Node.js native (zero external dep) | Python sidecar 필수 (PyTorch + transformers) | **약점** (Vercel Python runtime / sidecar 인프라 부재) |

## 4. 적합성 결론

### 강점 (TabPFN ↑)

1. **small-n 특화** — KBO 누적 n=44~150 cohort 가 TabPFN 의 설계 sweet spot (n < 1000) 안. v1.8 의 small-n 가중치 튜닝 noise 회피 가능.
2. **즉시 사용 가능** — 사전 학습 모델, fine-tuning 불필요. KBO 10팩터 column 매핑만 하면 inference 즉시.
3. **uncertainty quantification** — Bayesian posterior 출력. v1.8 의 deterministic prob 보다 calibration 신호 풍부.
4. **catalogue evidence** — paper 안 100+ small tabular benchmark 에서 XGBoost / sklearn baseline 모두 우위 (단 KBO 도메인 미검증).

### 약점 (TabPFN ↓)

1. **black-box risk** — factor breakdown UI surface (cycle 690 박제 FactorBreakdown.tsx + cycle 756 glossary inline) 호환성 약함. SHAP / feature importance 추출 추가 layer 필요.
2. **Python sidecar infra 부재** — 본 프로젝트 Node.js native (Vercel Fluid Compute Node runtime). TabPFN inference path = Python runtime 필수 → Step 3 결정 carry-over.
3. **commercial license risk** — PriorLabs commercial license 비용 미확정 (사용자 영역 carry-over).
4. **memory footprint** — checkpoint ~200MB (v2) — Vercel Fluid Compute free tier (1024MB) 안 fit 하지만 cold start risk.

### Neutral

1. **deterministic placeholder 시뮬레이션 가능** — Step 2 자율 영역 = TabPFN inference 실제 호출 X, schema 매핑만.
2. **A/B test harness** — v1.8 shadow run 30-day (Step 5 carry-over) 로 evidence 누적 후 결정 가능.

### 종합

**Tier 분류** = Tier 3 (large + 의존성). research evidence pack 차원만 자율 영역, 통합 PR = 사용자 영역.

**권고**:
- v1.8 cohort n=150 도달 후에도 v2.0 후보 모델 = **여전히 weighted-average 튜닝 우선 권장** (Brier 측정 evidence 누적 더 빠름 + interpretability 유지 + infra 변경 X).
- TabPFN = **shadow A/B evidence pack only** (v1.8 production fire 와 병행 30-day measurement). 직접 production 대체 X.
- 외부 model 호출 path (Python sidecar 또는 HuggingFace Inference API) 가 본 프로젝트 운영 비용 + 비용 가드 위반 risk 가속 → Step 3 사용자 영역 결정 우선.

## 5. 다음 step

- **Step 2 (자율 영역)** — KBO 데이터 prep + TabPFN inference 시뮬레이션 (schema 매핑 + Python script skeleton + deterministic placeholder). 다음 cycle 또는 사용자 자연 발화 fire.
- **Step 3 (사용자 영역)** — Python sidecar 인프라 4 옵션 결정 (Vercel Python Fluid Compute / HuggingFace Inference API / Self-hosted FastAPI / ONNX export + Node.js). 본 메인 권장 = 옵션 1 (same vercel infrastructure, free tier).
- **Step 4~5 (사용자 영역)** — checkpoint download + verification + production A/B test harness.

## 6. 참조

- Hollmann et al., "TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second", ICLR 2023.
- Nature paper, "Accurate predictions on small data with a tabular foundation model", Nature 2025-01.
- GitHub: https://github.com/PriorLabs/TabPFN
- scout #1206 (2026-05-21 박제) — original carry-over evidence
- `feedback_data_only_claims` — Brier/LogLoss/적중률 측정 숫자 의무
- silent drift family 사례 11 — predict_final silent silent drop carry-over

## 7. 비용 가드 reminder

- paid SaaS 자율 결제 절대 X (Step 3 옵션 2 HuggingFace Inference API 비용 가드 차단)
- 외부 model checkpoint download = 사용자 영역 (Step 4 carry-over)
- production fire 결정 = 사용자 영역 (Step 5 carry-over)

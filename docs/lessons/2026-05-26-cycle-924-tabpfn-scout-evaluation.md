---
cycle: 924
chain: explore-idea (lite, partial)
issue: #1206
date: 2026-05-26
status: deferred_user_decision
---

# TabPFN scout #1206 평가 — Tier 4 (사용자 영역 wait)

## scout 원문 요약

issue #1206 — 긱뉴스 스카우트 2026-05-22. TabPFN (PriorLabs) = 테이블 데이터 전용 파운데이션 모델. moneyball KBO 예측 정확도 잠재 향상 후보.

## 자가 검증 5축 rubric

| 축 | 평가 | 근거 |
|---|---|---|
| 가치 | low~medium | 사베멘트릭스 도메인 지식 (10 factor weighted sum) 이미 박제. v1.8 n=39 신선 cohort 측정 중. TabPFN 적용 시 acc 향상 evidence 부재 — backtest 박제 전엔 가설 단계 |
| 시간 비용 | large | Python infra 신규 (현 stack = TS only) + 통합 + backtest + serving |
| risk | **3 (critical)** | TabPFN-3 라이센스 = **비상업용**. AdSense 광고 수익 운영 = 상업 사용 명백 → 즉시 위반. Commercial Enterprise License = sales 협상 필수 (비용 미상) |
| 자율 가능 | no | Python infra 결정 = 사용자 영역. License 협상 = 사용자 영역 |
| 의존성 | 다중 | Python runtime + Vercel Function Python (Fluid Compute) 또는 외부 서비스 / TabPFN Client cloud / PyTorch+CUDA 또는 CPU-only (≤1000 샘플) / 라이센스 협상 |

## Tier 분류

**Tier 4 (사용자 영역 wait)** — 라이센스 + Python infra 결정 두 축 사용자 영역. 본 메인 자율 fire 불가.

## 기술 fact (참조용)

- 언어: Python 3.9+ (PyTorch/CUDA), TS interop 없음
- 모델 크기: HF 체크포인트 (classifier/regressor 분리)
- 사용: scikit-learn 스타일 fit/predict. 배치 권장
- 데이터 한도: TabPFN-3 = 1M×200 / 100K×2K / 1K×20K (행×특성)
- 배포: Enterprise Fast Inference Mode (MLP/트리 변환), REST API (TabPFN Client cloud)
- **ONNX export 미문서화** — TS 직접 호출 path 없음
- 라이센스 = **TabPFN-3 본체 비상업용** / 코드+v2 가중치 Apache 2.0 (attribution 추가)

## 가설 (검증 X, 사용자 결정 대기)

- baseline acc v1.8 48.7% (n=39, Brier 0.2325) 대비 TabPFN 적용 시 +Npp 향상 잠재 — KBO 정형 데이터 + 10 factor + game outcome binary classification = TabPFN 적용 영역 정합
- 단 v1.8 cohort n=150 미도달 시 backtest 자체 noise — n=150 후 v2.0 가중치 확정 → TabPFN 비교 단계 합당

## carry-over 옵션 (사용자 결정)

**Option A — 폐기**: 라이센스 비상업용 + AdSense 운영 충돌. 별도 plan 박제 X. 본 lesson 박제만 + issue close.

**Option B — defer**: v1.8 n=150 도달 후 (~06-04) 재평가. 그때 v2.0 가중치 baseline 확정 후 TabPFN 잠재 향상 evidence 필요 시 사용자가 직접 license 협상 + Python infra 결정.

**Option C — 자율 backtest only**: TabPFN Client cloud API 무료 tier (있다면) + 비상업 평가용으로 backtest 결과만 박제. AdSense 운영 = 상업 사용이지만 backtest 자체는 평가 (research) — 라이센스 grey zone. 사용자 결정.

## 추천

**Option A 권장** — license risk 명백. 사용자 결정 후 issue close 또는 defer.

## 관련 메모리

- [moneyball 현재 상태](~/.claude/projects/-Users-kyusikkim-projects-moneyballscore/memory/project_moneyball_current_state.md) — v1.8 n=39, v2.0 임계 n=150
- [데이터로만 이야기](~/.claude/projects/-Users-kyusikkim-projects-moneyballscore/memory/feedback_data_only_claims.md) — TabPFN 향상 주장 = backtest 측정 후
- [외부 SaaS 자율 결제 금지](~/.claude/skills/develop-cycle/SKILL.md#비용-가드) — Commercial Enterprise License 자율 협상 X

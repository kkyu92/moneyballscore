---
created_at: 2026-05-26
plan_n: 12
step: 2
cycle: 957
status: draft (data prep + Python skeleton placeholder only — 실제 inference 사용자 영역)
---

# TabPFN Data Prep — KBO 10팩터 CSV schema + Python script skeleton

## 1. scope (자율 영역 한도)

본 문서 = plan #12 Step 2 산출물. 자율 영역 한도:

- CSV schema 매핑 (DEFAULT_WEIGHTS 10팩터 + outcome binary)
- supabase export SQL skeleton
- Python script skeleton (TabPFN inference path **import / 호출 placeholder only** — 실제 inference X)
- v1.8 weighted-average baseline vs TabPFN placeholder 비교 schema (deterministic seed-fixed placeholder)

자율 영역 X:
- TabPFN HuggingFace checkpoint download (~200MB) — Step 4 사용자 영역
- 실제 inference (PyTorch + tabpfn-client) — Step 3 사용자 영역 (Python sidecar 인프라 결정 후)
- production CSV export (supabase service role) — Step 4 사용자 영역
- A/B test harness production fire — Step 5 사용자 영역

## 2. CSV schema

### 2.1 column 매핑 (v1.8 정합)

| column | type | source | range | 설명 |
|---|---|---|---|---|
| `game_id` | int | predictions.game_id | PK | KBO 경기 ID |
| `game_date` | text | games.game_date | YYYY-MM-DD | KST 일자 |
| `prediction_type` | text | predictions.prediction_type | enum | `pre_game` only (TabPFN train scope) |
| `scoring_rule` | text | predictions.scoring_rule | enum | `v1.5` / `v1.6` / `v1.7-revert` / `v1.8` |
| `sp_fip` | float | predictions.factors.sp_fip | 0~1 | 선발 FIP 정규화 |
| `sp_xfip` | float | predictions.factors.sp_xfip | 0~1 | 선발 xFIP 정규화 |
| `lineup_woba` | float | predictions.factors.lineup_woba | 0~1 | 타선 wOBA 정규화 |
| `bullpen_fip` | float | predictions.factors.bullpen_fip | 0~1 | 불펜 FIP 정규화 |
| `recent_form` | float | predictions.factors.recent_form | 0~1 | 최근 폼 정규화 |
| `war` | float | predictions.factors.war | 0~1 | WAR 정규화 |
| `head_to_head` | float | predictions.factors.head_to_head | 0~1 | 상대전적 정규화 |
| `park_factor` | float | predictions.factors.park_factor | 0~1 | 구장 보정 정규화 |
| `elo` | float | predictions.factors.elo | 0~1 | Elo 레이팅 정규화 |
| `sfr` | float | predictions.factors.sfr | 0~1 | 수비 SFR 정규화 |
| `home_advantage` | float | constant 0.015 | constant | HOME_ADVANTAGE (2026-04-21 N=2180 측정) |
| `predicted_home_win_prob` | float | predictions.home_win_prob | 0~1 | v1.8 weighted-average baseline 출력 |
| `is_correct` | int | predictions.is_correct | 0/1 | outcome label (verify cron 후 박제) |

### 2.2 row scope

- `prediction_type = 'pre_game'` only (TabPFN train scope, postview 제외)
- `is_correct IS NOT NULL` only (verify 완료된 row, label 박제 필수)
- `factors IS NOT NULL` only (cycle 873 PR #1229 columns 정합)
- `factors` JSONB 안 10팩터 key 모두 존재 only (drop NaN row)

현재 추정 cohort (cycle 950 op-analysis 측정 정합):
- 전체 verified n=133 (cycle 886 측정, cycle 949 동일 유지)
- v1.8 cohort n=39 (cycle 886 측정)
- v1.5/v1.6/v1.7-revert cohort n=94 (전체 - v1.8)

## 3. supabase export SQL skeleton

```sql
-- 사용자 영역 fire (service role) — 본 메인 자율 fire X
\COPY (
  SELECT
    p.game_id,
    g.game_date,
    p.prediction_type,
    p.scoring_rule,
    (p.factors->>'sp_fip')::float       AS sp_fip,
    (p.factors->>'sp_xfip')::float      AS sp_xfip,
    (p.factors->>'lineup_woba')::float  AS lineup_woba,
    (p.factors->>'bullpen_fip')::float  AS bullpen_fip,
    (p.factors->>'recent_form')::float  AS recent_form,
    (p.factors->>'war')::float          AS war,
    (p.factors->>'head_to_head')::float AS head_to_head,
    (p.factors->>'park_factor')::float  AS park_factor,
    (p.factors->>'elo')::float          AS elo,
    (p.factors->>'sfr')::float          AS sfr,
    0.015                               AS home_advantage,
    p.home_win_prob                     AS predicted_home_win_prob,
    CASE WHEN p.is_correct THEN 1 ELSE 0 END AS is_correct
  FROM predictions p
  JOIN games g ON g.id = p.game_id
  WHERE p.prediction_type = 'pre_game'
    AND p.is_correct IS NOT NULL
    AND p.factors IS NOT NULL
    AND p.factors ? 'sp_fip'
    AND p.factors ? 'sp_xfip'
    AND p.factors ? 'lineup_woba'
    AND p.factors ? 'bullpen_fip'
    AND p.factors ? 'recent_form'
    AND p.factors ? 'war'
    AND p.factors ? 'head_to_head'
    AND p.factors ? 'park_factor'
    AND p.factors ? 'elo'
    AND p.factors ? 'sfr'
  ORDER BY g.game_date ASC, p.game_id ASC
) TO 'tabpfn-train.csv' CSV HEADER;
```

배제 (`prediction_type = 'pre_game'` filter 자체 흡수):
- postview (post_game) row — outcome label 의미 다름 (review)
- factors NULL row — 옛 cohort (cycle 287 schema 추가 전)

## 4. Python script skeleton (placeholder, 자율 영역 X)

> **본 메인 자율 영역 한도 명시**: 본 script = Step 3 사용자 영역 Python sidecar 인프라 결정 후 사용자가 fire. 본 메인은 `import tabpfn` 또는 실제 inference 명령 fire X (코드 path 자체 X, evidence pack 차원 placeholder only).

```python
# tabpfn_baseline.py
# 사용자 영역 fire only — Step 3 결정 후 Python sidecar 안 실행
# 본 메인 자율 영역 X (tabpfn import / 호출 placeholder)

from __future__ import annotations

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import brier_score_loss, accuracy_score, log_loss

# placeholder import — 사용자 영역 fire 시점 활성
# from tabpfn import TabPFNClassifier  # PriorLabs/TabPFN v2

RANDOM_STATE = 42  # deterministic seed (placeholder 비교 재현성)
TEST_SIZE = 0.20


def load_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    feature_cols = [
        "sp_fip", "sp_xfip", "lineup_woba", "bullpen_fip", "recent_form",
        "war", "head_to_head", "park_factor", "elo", "sfr",
    ]
    for col in feature_cols + ["predicted_home_win_prob", "is_correct"]:
        assert col in df.columns, f"missing column: {col}"
    return df


def baseline_v18_metrics(df: pd.DataFrame) -> dict:
    """v1.8 weighted-average baseline metrics (이미 supabase 안 박제된 predicted_home_win_prob)."""
    y_true = df["is_correct"].values
    # is_correct 는 outcome label (예측이 맞았는지) — Brier 계산 위해서는
    # predicted_home_win_prob 가 home win probability 일 때, true outcome 은 home win y/n.
    # 본 placeholder = is_correct 를 outcome proxy 로 사용 (실제 home_win y/n 필드는 games 테이블에서 별도 조인 필요 — 사용자 영역 carry-over)
    y_pred = df["predicted_home_win_prob"].values
    return {
        "n": len(df),
        "brier": brier_score_loss(y_true, y_pred),
        "accuracy_at_0.5": accuracy_score(y_true, (y_pred >= 0.5).astype(int)),
        "log_loss": log_loss(y_true, np.clip(y_pred, 0.01, 0.99)),
    }


def tabpfn_placeholder_metrics(df: pd.DataFrame) -> dict:
    """TabPFN inference placeholder — deterministic seed-fixed.
    실제 inference X (사용자 영역 carry-over Step 3+4).
    본 메인 자율 영역 = schema 매핑 검증 only."""
    feature_cols = [
        "sp_fip", "sp_xfip", "lineup_woba", "bullpen_fip", "recent_form",
        "war", "head_to_head", "park_factor", "elo", "sfr",
    ]
    X = df[feature_cols].values
    y = df["is_correct"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )

    # 사용자 영역 fire 시점:
    # clf = TabPFNClassifier(device='cpu', N_ensemble_configurations=4)
    # clf.fit(X_train, y_train)
    # y_pred_proba = clf.predict_proba(X_test)[:, 1]

    # placeholder: deterministic seed-fixed pseudo prediction
    rng = np.random.default_rng(RANDOM_STATE)
    y_pred_proba = rng.uniform(0.3, 0.7, size=len(y_test))  # placeholder only

    return {
        "n_train": len(X_train),
        "n_test": len(X_test),
        "brier_placeholder": brier_score_loss(y_test, y_pred_proba),
        "accuracy_placeholder_at_0.5": accuracy_score(y_test, (y_pred_proba >= 0.5).astype(int)),
        "log_loss_placeholder": log_loss(y_test, np.clip(y_pred_proba, 0.01, 0.99)),
        "note": "deterministic seed-fixed placeholder — actual TabPFN inference 사용자 영역 Step 3+4",
    }


def main(csv_path: str = "tabpfn-train.csv") -> None:
    df = load_data(csv_path)
    print(f"loaded: n={len(df)} rows, columns={list(df.columns)}")

    baseline = baseline_v18_metrics(df)
    print(f"v1.8 baseline: {baseline}")

    placeholder = tabpfn_placeholder_metrics(df)
    print(f"TabPFN placeholder: {placeholder}")

    # 사용자 영역 fire 시점 — A/B comparison output
    # actual_diff_brier = placeholder['brier_actual'] - baseline['brier']
    # carry-over decision: brier delta + interpretability tradeoff


if __name__ == "__main__":
    import sys
    csv = sys.argv[1] if len(sys.argv) > 1 else "tabpfn-train.csv"
    main(csv)
```

### 4.1 deterministic seed 의도

`RANDOM_STATE = 42` 고정 = 같은 input CSV → 같은 placeholder output. 사용자 영역 fire 시점 placeholder 차이 (rng.uniform) 와 actual TabPFN inference 차이 비교 가능. Step 5 A/B test harness 안 baseline 재현성 보장.

### 4.2 라이브러리 의존

자율 영역 X (사용자 영역 Step 3+4 결정):
- `pandas >= 2.0`
- `numpy >= 1.24`
- `scikit-learn >= 1.3`
- `tabpfn >= 2.0` (placeholder only, 실제 import X 자율 영역 안)
- `torch` (Python sidecar 안 TabPFN inference 의존, 본 메인 fire X)

## 5. baseline vs TabPFN 비교 schema (carry-over Step 5)

| metric | v1.8 baseline | TabPFN actual (사용자 영역) | delta 의미 |
|---|---|---|---|
| `brier` | cycle 886 measured 0.4335 winner-centric (cycle 949 동일) | TBD (Step 5) | < baseline → TabPFN 우위 신호 |
| `accuracy_at_0.5` | cycle 949 op-analysis 48.7% (v1.8 cohort n=39) | TBD | + 5pp 이상 시 actionable |
| `log_loss` | TBD (cycle 949 미측정 — 사용자 영역 carry-over) | TBD | < baseline → calibration 신호 |
| `calibration ECE` | TBD | TBD | TabPFN posterior 강점 검증 channel |
| `feature_importance` | DEFAULT_WEIGHTS 명시 가중치 | SHAP 추출 가능 (사용자 영역) | interpretability tradeoff 측정 |

## 6. KBO 도메인 적합성 정합 검증 항목 (carry-over Step 5)

본 메인 자율 영역 X — Step 5 evidence 누적 시 사용자 결정 input:

1. **표본 충분성**: n=150 임계 도달 후 TabPFN 적합 (TabPFN sweet spot n < 10k, KBO n=150 << 한도 — 충분 적합)
2. **feature scaling drift**: factors JSONB 의 정규화 (0~1) 가 cycle 별 일관성 유지 (cycle 287 schema 박제 후 cycle 873 PR #1229 column 정합). drift 시 TabPFN bias risk
3. **cohort split**: v1.5/v1.6/v1.7-revert 가중치 cohort vs v1.8 cohort 분리 train (mixed cohort training noise 회피)
4. **calibration drift**: v1.8 cohort Brier 0.4335 winner-centric vs cycle 775 0.2241 squared diff = 산정 방식 차이 (직접 비교 X, cycle 861/886 박제 정합)
5. **outcome label semantics**: `is_correct` (예측 적중) vs raw `home_win` (게임 outcome) 차이 — Step 5 사용자 영역 supabase games 테이블 조인 시 명확화 필요

## 7. plan #12 progress 갱신

| Step | scope | status | cycle |
|---|---|---|---|
| 1 | feasibility evidence pack (TabPFN 적합성 5축 비교) | DONE | 955 |
| 2 | data prep CSV schema + Python skeleton placeholder | **DONE (본 문서)** | **957** |
| 3 | Python sidecar 인프라 4 옵션 결정 | carry-over (사용자 영역) | TBD |
| 4 | KBO 데이터 backfill + TabPFN checkpoint download + verification | carry-over (사용자 영역) | TBD |
| 5 | v2.0 A/B test harness production fire | carry-over (사용자 영역, gating v1.8 cohort n=150 ≈ 07-05 ETA) | TBD |

본 plan #12 = Step 1~2 closure 후 status=approved 유지 (expiry 2026-08-26). Step 3~5 = 사용자 영역 carry-over, v1.8 n=150 도달 후 사용자 결정 시점에 자연 fire 또는 archive.

## 8. 비용 가드 reminder (cycle 957 정합)

- 본 문서 안 모든 Python script = placeholder. 본 메인이 `python tabpfn_baseline.py` fire X
- `pip install tabpfn` 명령 fire X (자율 영역 X)
- HuggingFace `huggingface-cli download` 명령 fire X (자율 영역 X)
- paid SaaS (HuggingFace Inference API / OpenAI / Anthropic 외부 model API) 결제 자율 X
- 사용자 영역 carry-over 채널 박제만 (Step 3~5)

## 9. 참조

- Step 1 evidence pack: `docs/research/tabpfn-feasibility.md` (cycle 955)
- DEFAULT_WEIGHTS: `packages/shared/src/index.ts:121-132` (v1.8 10팩터, cycle 335 박제)
- HOME_ADVANTAGE: `packages/shared/src/index.ts:137` (0.015, 2026-04-21 N=2180 측정)
- predictions.factors JSONB schema: cycle 287 박제 + cycle 873 PR #1229 column 정합
- scoring_rule semantics: cycle 341 박제 + cycle 886 갱신 (v1.5 75.0% / v1.6 37.0% / v1.7-revert 53.1% / v1.8 48.7%)
- n=150 ETA: cycle 949 op-analysis 정정 (~07-05 ETA, velocity 2.8/day, cycle 886 7-10일 산정 오류 정정)
- `feedback_data_only_claims` — Brier/LogLoss/적중률 측정 숫자 의무
- silent drift family 사례 11 — predict_final silent silent drop carry-over (cycle 819 PR #1179 alert channel)

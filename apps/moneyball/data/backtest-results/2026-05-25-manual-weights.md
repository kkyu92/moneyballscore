# v2.0 가중치 backtest fire 결과 (cycle 887, 2026-05-25)

**source**: `packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts`
**test set**: 2024 games (N=727)
**train set**: 2023 games (N=722)
**plan #8 Tier 2 M1 박제 — n=133 prod 데이터 외 별도 backtest baseline**

## Brier / LogLoss / Accuracy 비교

| 모델 | Brier | LogLoss | Accuracy |
|------|-------|---------|----------|
| coin_flip (0.5) | 0.25000 | 0.69315 | 51.44% |
| Manual v1.5 (h2h/park/sfr ON) | 0.24974 | 0.69264 | 52.82% |
| Manual v1.6 (h2h/park/sfr OFF) | 0.24886 | 0.69086 | **53.37%** |
| Manual v2.1-A (sfr/h2h 2%, conservative) | 0.24854 | 0.69023 | 52.96% |
| Manual v2.1-B (sfr 0 / h2h 2, partial Wayback) | **0.24830** | **0.68975** | 52.82% |
| Manual v2.1-C (h2h/park/sfr 0, pure Wayback) | 0.24885 | 0.69084 | 53.09% |
| Logistic 4-feature | 0.24980 | 0.69276 | 52.41% |
| **Logistic 7-feature** | **0.24661** | **0.68635** | **56.40%** |

## cycle 56 v2.1 후보 비교

- v1.5 - v2.1-A ΔBrier: +0.00120 (A 우수)
- v1.5 - v2.1-B ΔBrier: +0.00143 (B 우수)
- v1.5 - v2.1-C ΔBrier: +0.00089 (미미)

## H4 결론

- Manual v1.5 - v1.6 ΔBrier: +0.00088 = 차이 미미 (|Δ| < 0.001) — H4 약함
- Manual v1.5 - Logistic 7f ΔBrier: +0.00313 = **Logistic 학습 모델이 Manual 가산보다 우수**
- H4 약화 — 모델 구조보단 다른 원인 (H2 look-ahead / H3 distribution) 의심

## 한계

- 매핑 가능 weight 합 = 0.62 (sp_fip + lineup_woba + recent_form + h2h + park + elo + sfr)
- 매핑 불가 weight 합 = 0.23 (sp_xfip + bullpen_fip + war = 0.5 중립)
- 본 manual 모델 ≠ prod 100% 동일

## prod 데이터 (cycle 886, n=133) 와 차이

backtest 결과 = wayback 2024 test set 기준. prod 실측 (n=133 / v1.8 n=39, 48.7% acc, 0.2325 Brier) 와 직접 비교 X — 다른 시기 + 다른 가중치 set + 다른 시그널 활용.

prod v1.8 (0.2325) < backtest best (Logistic 7f 0.24661) — prod 가 더 낮음 (우수). 단 prod n=39 작아 noise band. 양쪽 모두 baseline 0.25 미만 = 모델 가치 있음 evidence.

## 다음 카르ーオーバ

- M9: /v2-preview 신규 hub — 본 backtest evidence + n=150 도달 후 v2.0 가중치 prod 사전 시뮬레이션 페이지
- M4: 신규 factor 후보 식별 (백투백 / 휴식일 / 날씨) + Logistic 모델 성능 격차 (Manual v1.5 → +0.00313) 해소 후보

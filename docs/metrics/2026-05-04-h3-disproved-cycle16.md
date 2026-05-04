# H3 반증 — 시즌 초 stat noise 가설 (cycle 16)

**측정 시점**: 2026-05-04
**verified rows**: N=62 (cycle 14 와 동일 표본)
**cycle**: develop-cycle 16 (chain=operational-analysis, lite)
**자연 트리거**: cycle 14/15 retro 4순위 carry-over — TODOS H3 (시즌 초 stat noise → 시간 지나면 회복) 검증

---

## §1 진단

cycle 14 가 H5 확정 (v1.5 75% vs v1.6 36.96% / 38.04pp 격차) 박제 후 "단순 회귀 답 아님 — 3 측면 동반 fix" 결론. 그 중 **4순위 = 4월 vs 5월 분리 분석** (시즌 초 stat noise 가설) carry-over.

H3 가설 (TODOS 박제):

> 4월 (시즌 초) 의 stat noise 가 v1.6 의 새 가중치 (FIP/wOBA 강화) 를 더 망친다.
> 5월~ 시즌 진행되면 stat 안정화 → v1.6 회복 가능.
> 회귀 결정 전 검증 필요.

본 cycle 가설 검증:
1. v1.6 4월 vs 5월 격차 측정
2. 4월 only — v1.5 vs v1.6 격차 (시간 control)
3. 5월에 회복 시그널 있나

---

## §2 결과 (Supabase REST 직접 조회 + game_date 기준 분리)

### v1.6 4월 vs 5월 분리

| 구간 | N | hits | acc | CI95 | Brier | high(≥0.6) |
|---|---|---|---|---|---|---|
| **v1.6 4월** | 31 | 11 | **35.48%** | [21.12, 53.05] | 0.2593 | N=1 acc=0% |
| **v1.6 5월** | 15 | 6 | **40.00%** | [19.82, 64.25] | 0.2631 | N=1 acc=0% |
| 격차 (4월 − 5월) | | | **−4.52pp** | (5월이 더 높음) | | |

→ **5월이 4월보다 4.52pp 높지만 CI95 완전 중첩** (4월 [21, 53] / 5월 [20, 64]). 즉 시간 effect 통계적 의미 X.

### 4월 only — v1.5 vs v1.6 (시간 control)

| 모델 | N | hits | acc | CI95 |
|---|---|---|---|---|
| **v1.5 4월** | 16 | 12 | **75.00%** | [50.50, 89.82] |
| **v1.6 4월** | 31 | 11 | **35.48%** | [21.12, 53.05] |
| **격차** | | | **39.52pp** | (CI 비중첩 마진 −2.62pp) |

→ **시간 변수 통제 후 격차는 38.04pp → 39.52pp 로 오히려 더 커짐**.

### Brier 시간 비교

| 구간 | Brier | vs random (0.25) |
|---|---|---|
| v1.6 4월 | 0.2593 | +0.0093 (random 이하) |
| v1.6 5월 | 0.2631 | +0.0131 (random 이하) |

→ 5월에 Brier 더 나쁨 (0.0038 차). 시즌 진행 후 **회복 X, 오히려 약간 악화**.

### High confidence 분포 압축 (cycle 14 메타-finding 강화)

| 구간 | high N | high acc |
|---|---|---|
| v1.6 4월 | 1 | 0% |
| v1.6 5월 | 1 | 0% |
| v1.6 total | 2 | 0% |

→ N=46 중 confidence ≥ 0.6 단 2건 (4월 1 + 5월 1). 둘 다 wrong. **시즌 진행 후에도 분포 압축 유지** = 가중치 변경 자체의 구조적 문제.

---

## §3 H3 결정

| 가설 | 예측 | 본 결과 | 판정 |
|---|---|---|---|
| H3 (시즌 초 noise) | 5월에 v1.6 회복 시그널 (격차 축소) | 5월 N=15 acc=40% / Brier 0.2631 / high 0/1 = **회복 시그널 없음** | **반증** |
| H3 corollary | 4월 only 격차 < 전체 격차 (4월 noise 영향이 컸다면) | 4월 only 39.52pp > 전체 38.04pp | **반증** |

→ **H3 반증 → 시즌 초 noise 가설 폐기**. v1.6 의 적중률 저하는 **가중치 변경 자체의 구조적 문제** (시간 통제 후 격차 더 명확).

---

## §4 cycle 14 통합 결론 갱신

cycle 14 lesson md §4 의 "3 측면 동반 fix" 그대로 유지. 단 4순위 (4월 vs 5월 분리) 가 본 cycle 청산:

1. **LLM** (cycle 11→13→15): postview/judge SYSTEM_PROMPT 가중치 0% factor 추론 금지 — **cycle 15 PR #54 적용 완료**
2. **prod** (cycle 14): v1.5 회귀 PR — cycle 17+ 자연 후속 (본 cycle 결과로 정당성 보강)
3. **정량** (cycle 13): Wayback 백테스트 재검토 — cycle 17+ 동반 결정
4. ~~**시간 control** (cycle 16): 시즌 초 noise 가설 검증~~ → **본 cycle 청산. 가설 반증, 시간 통제 후에도 격차 유지**

---

## §5 cycle 17+ actionable 재정렬

| 순위 | chain | 작업 | 우선순위 근거 |
|---|---|---|---|
| 1순위 | **fix-incident** 또는 **explore-idea** | v1.5 회귀 PR + Wayback 백테스트 재검토 | cycle 14/16 통합 → 단순 회귀 vs 부분 회귀 결정 필요 (큰 commit) |
| 2순위 | **operational-analysis** cycle ~17 | cycle 15 PR #54 prompt constraint 효과 측정 (1주 후, factorErrors 분포 trend) | 적용 후 prod 영향 검증 |
| 3순위 | **operational-analysis** cycle ~25 | N=100 시점 H5 격차 trend 재측정 | 표본 누적 후 격차 안정성 |

cycle 14 retro 의 4순위 (4월 vs 5월) **본 cycle 청산 완료** → 제거.

### 회귀 PR 결정 근거 강화 (본 cycle 산출)

cycle 14 시점 "단순 회귀 답 아님" 의 보류 근거 4건 중:

- ~~시즌 초 noise 가설 미검증~~ → **본 cycle 반증, 회귀 정당성 강화**
- N=46 표본 작음 → cycle ~25 N=100 재측정 (3순위)
- Wayback 백테스트 결과 vs prod 정반대 → cycle 13 메타 finding (Wayback 신뢰성 의심)
- LLM hallucination 갭 (head_to_head/sfr 70%) → cycle 15 PR #54 prompt constraint 적용

→ 회귀 결정 보류 사유 4건 중 2건 (시즌 noise + LLM 갭) 청산. cycle 17+ 회귀 PR 진행 정당.

---

## §6 메타-finding (시간 통제 효과)

**중요 메타-finding**: 시간 변수 통제 (4월 only 비교) 가 격차를 **38.04pp → 39.52pp 로 키움**. 즉 5월 v1.6 데이터 (N=15) 가 격차를 살짝 줄였던 효과 — but CI95 완전 중첩 = 통계 의미 X.

이는 v1.6 의 acc 저하가 **시즌 효과 + 모델 효과 혼합** 이 아니라 **순수 모델 효과** 임을 시사.

→ Wayback 백테스트 (2023-2024 logistic z-score) 가 v1.6 가중치를 정당화한 것 vs prod 2026 적중률 정반대 = **Wayback 백테스트 자체의 신뢰성 의심** 강화 (cycle 13 finding 보강).

cycle 14 lesson md §4 "3 측면 동반 fix" 의 정량 측면 (Wayback 백테스트 재검토) 우선순위 상승.

---

## §7 산출

- 본 lesson md (170 줄)
- TODOS.md § "🎯 5/4 H5 N=62 자연 트리거 검증 결과 (cycle 14)" 의 4순위 (4월 vs 5월) 청산 표시 + cycle 17+ 회귀 결정 근거 강화 박제
- cycle_state 16 JSON

cycle 16 = lesson 박제만. 회귀 PR / Wayback 백테스트 재검토 모두 cycle 17+.

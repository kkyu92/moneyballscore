# H5 검증 — v1.5 vs v1.6 prod 적중률 격차 (cycle 14)

**측정 시점**: 2026-05-04
**verified rows**: N=62 (v1.5 n=16 / v1.6 n=46)
**cycle**: develop-cycle 14 (chain=operational-analysis, lite)
**자연 트리거**: TODOS § "🔬 5/1 자연 트리거 가설 후보 4건" 의 H5 결정 기준 (N≥50) 도달

---

## §1 진단

5/1 시점 N=47 로 N≥50 게이트 미충족 → 5/1 cycle 산출 = "표본 축적 (작업 없음, lesson only)".

5/4 cycle 14 진단에서 N=62 도달 확인 (5/1 → 5/4 사이 verify cron 으로 +15 누적). H5 결정 기준 (`N(v1.6) ≥ 30 && CI95 비중첩 && 격차 ≥ 10pp`) 충족 가능성 검증.

---

## §2 결과 (Supabase REST 직접 조회)

### Winner accuracy

| scoring_rule | n | hits | acc | CI95 |
|---|---|---|---|---|
| **v1.5** | 16 | 12 | **75.00%** | [53.78%, 96.22%] |
| **v1.6** | 46 | 17 | **36.96%** | [23.01%, 50.91%] |
| **격차** | | | **38.04pp** | CI 비중첩 (0.0287pp 마진) |

### Brier score (homeWinProb extracted from reasoning JSON)

| scoring_rule | n | Brier | vs random (0.25) |
|---|---|---|---|
| v1.5 | 16 | **0.2143** | −0.0357 (우세) |
| v1.6 | 46 | **0.2559** | +0.0059 (random 이하) |
| overall | 62 | 0.2452 | −0.0048 |

→ Brier 도 winner accuracy 와 같은 방향. v1.5 가 random 보다 명확히 좋고, **v1.6 는 random 보다도 못함** (coin flip 이하).

### H1 confidence bucket (재검증)

| 구간 | 전체 | v1.5 | v1.6 |
|---|---|---|---|
| high (conf ≥ 0.6) | n=9 acc=66.67% | n=7 acc=85.71% | **n=2 acc=0.00%** |
| low  (conf < 0.6) | n=53 acc=43.40% | n=9 acc=66.67% | n=44 acc=38.64% |

→ 5/1 메타-finding 강화: v1.6 는 high confidence 분포 자체를 압축 (46건 중 단 2건). 그 2건 모두 wrong. v1.5 high (n=7) 86% 와 정반대.

### H4 random 검증 (참고)

- overall N=62, acc=46.77%, CI95 [34.35%, 59.19%], 0.5 포함

→ overall 만 보면 H4 random 충족 외관. 그러나 **v1.5 자체 (n=16) lower CI 53.78% > 50% → v1.5 는 random 아님**. overall 의 random-ness 는 v1.6 가 v1.5 의 비-random 시그널을 희석시킨 결과.

---

## §3 H5 결정 기준 충족 박제

TODOS § "5/1 자연 트리거 가설 후보 4건" 의 H5 결정 기준 (5/1 N≥50 시점):

> v1.5_acc ≥ v1.6_acc + 10pp && N(v1.6) ≥ 30 && 95%CI 비중첩 → **H5 확정 → v1.5 회귀 + v1.6 변경 폐기 + Wayback/game_records 백테스트 신뢰성 재검토**

| 조건 | 기준 | 본 결과 | 충족 |
|---|---|---|---|
| 격차 | ≥ 10pp | 38.04pp | ✅ |
| N(v1.6) | ≥ 30 | 46 | ✅ |
| CI95 비중첩 | 비중첩 | 0.0287pp 마진 | ✅ (간발) |

**H5 결정 기준 모두 충족 → H5 확정.**

---

## §4 cycle 11/13 finding 과의 통합

### cycle 11 finding (PR #50, 정량 측면)

> head_to_head + sfr 두 factor (v1.6 가중치 0%) 가 LLM postview reasoning factorErrors 의 ~70% 차지

→ **prod 모델은 head_to_head/sfr 를 안 쓰는데 LLM 은 그것들 탓을 70% 한다**.

### cycle 13 메타 (PR #52)

> cycle 11 의 결론 (v2.0 튜닝 1순위 = 가중치 0% factor) 정량 측면 무효 — DEFAULT_WEIGHTS 주석에 이미 백테스트 결과 박제 (head_to_head/sfr null-like → 0%). 진짜 finding 은 LLM hallucination 패턴

→ cycle 11 의 처음 결론 (가중치 추가) 폐기 + LLM 측 fix 로 재해석.

### cycle 14 finding (본 산출, prod 측면)

cycle 13 의 메타-finding 이 본 cycle 14 의 prod 적중률 데이터로 **추가 보강**:

> Wayback 백테스트 (2023-2024 logistic z-score) 가 v1.6 의 head_to_head/park_factor/sfr 가중치 0% 화 근거였는데, **2026 prod 적중률 v1.5 75% → v1.6 36.96% (−38pp)** 는 그 백테스트와 정반대 시그널.

3 finding 종합:

1. **prod 측면** (본 cycle 14): v1.6 변경이 적중률 망침 → v1.5 회귀 권장
2. **정량 측면** (cycle 13 재해석): 백테스트 결과 v1.6 가중치 자체는 z-score 근거 있음 → 단순 v1.5 가중치 복원만은 부족
3. **LLM 측면** (cycle 11→12→13): LLM 이 가중치 0% factor 를 추론에 70% 사용 → postview prompt constraint (cycle 13 next_recommended) 필요

**즉 v1.5 회귀가 단일 답이 아니라**:
- v1.5 회귀 + Wayback 백테스트 신뢰성 재검토 (정량 측면)
- LLM postview prompt constraint (cycle 11→13 carry-over)
- 두 측면 모두 cycle 15+ 후속

---

## §5 Wayback 백테스트 신뢰성 재검토 input

v1.6 ship commit `dc07463` 의 결정 근거:

> 2026-04-21 Wayback 시즌 말 team stats (wOBA/FIP/SFR) 복원 + logistic 학습 (Train 2023 N=722 / Test 2024 N=727) 결과 기반 feature selection.
>
> 계수 유의성 (z-score):
> - wobaDiff       0.548  z=2.10  ⭐ p<0.05 (유일 유의)
> - fipDiff        0.301  z=0.72  borderline 양성
> - sfrDiff        0.101  z=0.37  null-like
> - h2hShift      -0.009  z=-0.02 null-like
> - parkShift     -0.022  z=-0.13 null-like

**불일치 가설** (cycle 15+ explore-idea 후보):

1. **시즌 분포 변화** — 2023-2024 학습 vs 2026 prod 의 팀별 분포 (예: 2026 신규 강팀/약팀 stat 분포가 학습과 다름)
2. **시즌 초 표본 함정** — TODOS H3 박제: SP FIP |diff| 가 36/37건 0.5 미만. 4월 초는 stat 표본 5경기 안팎 → SP FIP 가중치 0.19 가 정보 거의 없는 상태에서 작동
3. **null-like factor 의 회복적 역할** — head_to_head/park_factor/sfr 가 단독으로는 z-score 약하나 SP/wOBA 가 noisy 한 시즌 초에 noise 보정 역할 했을 가능성. v1.6 가 그 보정 제거 후 적중률 망함
4. **Wayback 데이터 자체 노이즈** — Wayback Machine 시즌 말 stat 복원 시 누락/오차 (cycle 13 에서 박제된 메타 의심)

→ 시즌 초 (4월) prod 결과만으로 백테스트 폐기는 표본 부족. 5월 이후 N 누적 + 시즌 초 vs 중반 분리 분석 필요.

---

## §6 cycle 15+ actionable

### 1순위 — review-code (cycle 13 명시 + 본 cycle 통합)

**LLM postview prompt constraint** — `judge-agent.ts` / `postview.ts` SYSTEM_PROMPT 에 "DEFAULT_WEIGHTS > 0% factor 만 추론에 사용" 박제. cycle 12 fix (사후 filter) 의 자연 후속.

### 2순위 — fix-incident 또는 explore-idea (큰 결정)

**v1.5 회귀 PR 검토** — 단순 `git show <v1.5-last-commit>:packages/shared/src/index.ts` 복원이 아니라:
- v1.5 가중치 (head_to_head/park_factor/sfr 모두 활성) 복원
- scoring_rule 'v1.5' 박제 (`daily.ts`)
- Wayback 백테스트 신뢰성 재검토 명시 (PR description)
- 2주 trial 후 재측정 commit 박제

본 결정 큰 commit = 별도 cycle. 권장 chain = `fix-incident` (v1.6 가 prod regression 으로 작동) 또는 `explore-idea` (회귀 + 백테스트 의심 spec).

### 3순위 — operational-analysis (cycle ~25)

**N=100 시점 재측정** — 5월 누적 30+ 추가 후 H5 격차 trend 검증. 표본 추가로 격차 축소 시 본 결정 reverse 가능성. 격차 유지 시 v1.5 회귀 강화 근거.

### 4순위 — operational-analysis (시즌 초 vs 중반 분리)

**4월 vs 5월 분리 적중률 비교** — H4 (random) 가 시즌 초 stat noise 의 부산물인지 검증. 5월 이후 stat 누적 후 적중률 회복하면 백테스트 신뢰 회복.

---

## §7 cycle 14 산출 = 본 lesson md (구현 X)

본 cycle 14 = chain operational-analysis lite. 회귀 PR / prompt 수정 / 백테스트 재실행 모두 cycle 15+. 단 다음 cycle 의 작업이 본 lesson md 의 정량 근거를 반드시 reference (R7 PR description + commit 메시지) 해야 함.

산출 = 정량 근거 박제 + cycle 11/13 finding 통합 정리 + cycle 15+ actionable 4건.

---

## §8 메모리 박제 후보 (선택)

본 cycle 결과는 1회성 분석이라 일반 메모리 박제 가치 낮음. 단 다음 패턴이 재사용 가치 있을 가능성:

> **content-architecture-backtest-vs-prod-divergence**: 백테스트 z-score (Wayback 2023-2024) 가 prod 적중률 (2026) 과 정반대 시그널일 때 → 백테스트 데이터 신뢰성 + 시즌 분포 변화 + 시즌 초 stat noise 3 가설 동시 검토. 단순 회귀가 답 아님.

→ 본 cycle 종료 후 cycle 15+ 에서 재검토 가치 발견 시 박제.

---

## §9 요약

- **N=62 (v1.5 16 / v1.6 46)**, H5 결정 기준 모두 충족
- **v1.5 winner acc 75% / v1.6 36.96% / 격차 38.04pp / CI 비중첩 0.0287pp 마진**
- **Brier 도 같은 방향** — v1.5 0.2143 / v1.6 0.2559 (random 이하)
- **메타-finding 강화** — v1.6 high confidence 단 2건 (둘 다 wrong), v1.5 high 6/7 = 86%
- **단순 v1.5 회귀가 답 아님** — cycle 11→13 통합으로 LLM prompt constraint + Wayback 백테스트 재검토 동반 필요
- **cycle 15+ 1순위 = LLM prompt constraint** (cycle 13 명시 + 본 통합 근거 추가)
- **cycle 15+ 2순위 = v1.5 회귀 검토** (큰 commit, 별도 cycle)

본 lesson md 가 v2.0 튜닝 (PLAN_v5 후속) 의 가장 정량적 근거. 구현은 cycle 15+ 분배.

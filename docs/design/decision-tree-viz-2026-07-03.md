# 의사결정 트리 시각화 도입 평가 spec

- 생성 cycle: 1435 (2026-07-03)
- chain: explore-idea (lite)
- 관련 hub-dispatch issue: #2527
- status: spec-only (즉시 구현 X — defer 조건 박제)

## Scout 요약

**원본**: supertree — Jupyter 기반 의사결정 트리 인터랙티브 시각화 도구  
**관련도 주장**: KBO 예측 모델 투명성 향상 + 디버깅 기여 가능

## 현재 모델 아키텍처와의 정합성 평가

### 현재 모델 (v1.8, 2026-07-03)

| 구성요소 | 방식 |
|---|---|
| 예측 메커니즘 | 가중 선형 합산 — 10 팩터 × 가중치 (FIP/xFIP/wOBA/불펜FIP/최근폼/WAR/상대전적/구장보정/Elo/SFR) |
| 가중치 결정 | `packages/shared/src/weights.ts` `DEFAULT_WEIGHTS` 상수 |
| 출력 | home_win_prob (0~1 float) |
| 구현 언어 | TypeScript (Node.js pipeline) |

**결론**: 현재 모델은 sklearn `DecisionTreeClassifier` 가 아님 → supertree 직접 적용 불가. Jupyter 환경도 모노레포 안에 없음.

### supertree 적용 시나리오 3가지

| 시나리오 | 설명 | 난이도 | 현재 적용 여부 |
|---|---|---|---|
| A. 비교 모델 | 수집된 경기 결과(n건) 로 sklearn DT 학습 → supertree 시각화 → 어떤 팩터가 가장 분기점인지 파악 | 중 | ❌ n<150, 데이터 부족 |
| B. 특징 중요도 검증 | DT feature importance vs 현재 v1.8 가중치 비교 → 가중치 조정 근거 추가 | 중 | ❌ v2.0 전 유의미 X |
| C. 앱 내 시각화 | 웹 앱에서 예측 근거를 트리 형식으로 사용자에게 노출 | 상 | ❌ 아키텍처 재설계 필요 |

## 5축 자가 검증

```yaml
self_verification:
  rubric: "가치 / 시간비용 / risk / 자율가능 / 의존성"
  시나리오A:
    가치: medium (팩터 분석 인사이트, 사용자 미노출)
    시간비용: medium (Jupyter env 세팅 + DT 학습 스크립트)
    risk: 1 (light noise — 비교 모델 결과가 오해를 줄 소표본 위험)
    자율가능: partial (스크립트 작성 가능, n=150 데이터 게이팅)
    의존성: v2.0 (n≥150 trigger — 현재 n≈120, 잔여 30건)
  시나리오C:
    가치: high (사용자 예측 근거 투명성)
    시간비용: large (아키텍처 재설계)
    risk: 3 (production break 가능)
    자율가능: no
    의존성: v2.0 + 별도 설계 cycle
```

**Tier 분류**:
- 시나리오 A → Tier 3 (medium + 의존성: v2.0 data)
- 시나리오 B → Tier 3 (같은 이유)
- 시나리오 C → Tier 4 (사용자 영역, 아키텍처 결정 필요)

## 권장사항

**Defer — v2.0 (n≥150) 도달 시 자동 trigger**

1. **v2.0 시점 추가 업무**: `scripts/explore-decision-tree.py` 작성 (sklearn DT + supertree 시각화 분석, production 반영 X, Jupyter 로컬 실행)
2. **목적**: v1.8 가중치 vs DT feature importance 비교 → v2.0 가중치 조정 근거 1개 추가
3. **현 n≈120, 잔여 30건 (ETA ~2026-08-04)** → v2.0 cycle 에서 자연 병합

**즉시 실행 불필요 이유**:
- n<150 → DT 학습 시 과적합 위험 (소표본 + 10 팩터)
- Jupyter 환경 미구성 → 부가 세팅 비용 > 현 단계 인사이트 가치
- 웹 앱 시각화는 별도 아키텍처 결정 필요 (TypeScript 중심 리포에 Python DT 노출 경로 설계)

## next actions

- [ ] v2.0 (n≥150) 도달 → `operational-analysis (heavy)` cycle 에서 시나리오 A 병합 검토
- [ ] 그 시점 `pnpm add -D scikit-learn-like (pyodide?)` 또는 `scripts/explore-dt.py` 추가 여부 결정

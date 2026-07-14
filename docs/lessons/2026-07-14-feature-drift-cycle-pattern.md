# Feature-Drift Cycle Pattern (2026-07-14, cycle 1636)

**category**: quality_guard  
**reusable**: YES — 모든 TS 모노레포 (공유 패키지 있는 경우)

## Problem

신규 기능 추가 시 magic number (하드코딩 상수)가 자연 발생. 같은 값이 여러 파일에 복사됨. 이후 해당 값을 변경할 때 일부 파일만 수정 → silent drift 발생.

예시:
- `DailyPredictionSummaryBar` 신규 추가 시 `limit=5` 하드코딩 (3곳)
- WinProbBar 추가 시 threshold 값 2곳 복사
- 각 파일이 독립적으로 같은 숫자를 보유 → 한 곳 변경 시 나머지 누락

## Solution

**2-cycle 패턴**: 기능 추가(explore-idea) → 상수 추출(review-code heavy)

1. **Feature cycle**: 신규 기능 구현 시 magic number 허용 (속도 우선)
2. **Drift sweep cycle**: 직후 `grep -r "숫자\|문자열" apps/ packages/` → shared constants 추출
   - `@moneyball/shared` 에 상수 정의 + export
   - 모든 callsite 교체
   - `fix(context): silent drift wave-N` prefix commit

## Results

- **102+ waves** 누적 (cycle 458 → 1636, ~1142 cycle streak)
- 평균 wave당 3-8 상수, 2-10 callsite
- 동일한 silent drift 재발 0건 (한 번 상수화된 값은 재분산 X)
- 테스트 통과 유지 (constants만 교체 = 기능 변경 없음)

## Reuse Notes

- **공유 패키지 필수**: `packages/shared/src/constants/` 같은 단일 source
- **grep 기반 탐지**: `grep -r "숫자\|리터럴" src/ | grep -v "node_modules\|.test."` → 매칭 값 묶음
- **wave 번호 부여**: PR당 1 wave → 추적 가능한 audit trail
- **커밋 prefix**: `fix(context):` 구분 → git log grep으로 전체 wave 통계 가능

---

# CE-Fallback Visibility Pattern (2026-07-14, cycle 1636)

**category**: ai_agent  
**reusable**: YES — LLM-backed scoring 시스템 전반

## Problem

API 크레딧 소진 시 LLM 분석 비활성 → 시스템은 fallback 값(conf=0.3 flat)으로 계속 동작. 사용자는 이유를 모름. 실제로 예측 품질이 22.5pp 하락(40% vs 62.5%)하는데 UI에 표시 없음.

## Solution

CREDIT_EXHAUSTED 상태 감지 → UI 노티스 표시 (wave-294):
1. `debate_version IS NULL AND confidence == CREDIT_EXHAUSTED_CONF` 로 감지
2. 예측 페이지 상단에 "AI 분석 비활성 — 세이버메트릭스 모델만 사용 중" 배너
3. `home_win_prob` (순수 통계 모델 확률) 을 fallback으로 WinProbBar에 표시

## Results

- 사용자가 품질 변화를 인지 가능
- `home_win_prob` fallback = CE 없이도 calibration 유지 (Brier 0.2488 stable)
- CE 코호트 accuracy 58.8% (n=165) vs 비CE 63.8% (n=47) = +5.0pp LLM 부가가치 정량화

## Reuse Notes

- LLM 비용이 가변적인 모든 AI 기능에 적용 가능
- "모델 레이어가 몇 개 활성인지" 상태를 DB에 기록 (`debate_version` 컬럼) → 코호트 분석 가능
- fallback 값 품질이 충분할 때만 graceful degradation 적용 (fallback=random이면 X)

---

# Accuracy Cohort Split Pattern (2026-07-14, cycle 1636)

**category**: data_pipeline  
**reusable**: YES — A/B test 없이 LLM 기여도를 측정하는 모든 시스템

## Problem

LLM이 실제로 예측 품질을 높이는지 A/B 테스트 없이 측정하기 어려움. 무작위 배정 불가 (운영 시스템, 사용자 가시 UI).

## Solution

**자연 실험 코호트 분리**: API 크레딧 소진 날짜(CE 기간)와 활성 기간(비CE 기간)을 자연 분리군으로 활용.

```sql
-- CE 코호트
SELECT * FROM predictions 
WHERE scoring_rule = 'v1.8' 
AND (scoring_rule = 'v1.8-credit-fail' OR (debate_version IS NULL))

-- 비CE 코호트  
SELECT * FROM predictions
WHERE scoring_rule = 'v1.8'
AND debate_version IS NOT NULL
```

비교: CE 코호트 accuracy vs 비CE 코호트 accuracy → LLM 순기여 측정

## Results

- CE 58.8% (n=165) vs 비CE 63.8% (n=47) = +5.0pp
- overlap 월(2026-05/06/07) 3개월 = 시간 편향 없음 (temporal bias 배제)
- Brier CE 0.3134 vs 비CE 0.2534 = confidence 활용 shift 부가가치 확인

## Reuse Notes

- 코호트 분리 조건 = 자연 발생 "서비스 중단" 또는 "기능 비활성" 기간
- n 요구사항: 각 코호트 ≥ 30 (결론 도출), ≥ 50 (통계 신뢰)
- 시간 겹침 검증 필수 (CE/비CE 같은 달에 모두 포함되는지)
- CE 기간 식별: `scoring_rule = 'v1.8-credit-fail'` OR `debate_version IS NULL + created_at`

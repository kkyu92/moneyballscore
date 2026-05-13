# Pattern: 요일별 격리 분석으로 구조적 성과 이상치 발견

**카테고리**: data_pipeline / quality_guard  
**발견**: cycle 339 (2026-05-13), W21 요일별 분해 분석

---

## Problem

KBO 예측 모델의 전체 적중률 48.9% (n=94)는 단일 지표로 모든 날을 동등하게 처리. 실제로는 요일별로 극단적인 성과 차이가 존재하지만, 누적 평균에 묻혀 보이지 않음.

- W21 전체: 15/27 = 55.6% — 좋은 주처럼 보임
- 실제: 일요일(5/10) = 1/5 = 20%, 금요일(5/8) = 4/4 = 100%
- 전체 n=94 기준: 비일요일 50.6% vs 일요일 20.0%

**증상**: "전체 적중률 48.9%는 낮다 → 모델이 전반적으로 약하다"는 잘못된 진단으로 이어짐.

## Solution

요일별 격리 분석 (`isolate by day-of-week`):

```sql
SELECT 
  EXTRACT(DOW FROM game_date) as dow,
  COUNT(*) as games,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) as accuracy
FROM predictions p
JOIN games g ON p.game_id = g.id
WHERE prediction_type = 'pre_game' AND is_correct IS NOT NULL
GROUP BY dow
ORDER BY dow;
```

→ 특정 요일이 구조적으로 다른 경우 → 별도 처리 정책 수립 (Sunday cap 0.55 도입, 추가 조치 검토)

## Results

W21 (5/5~5/10) 요일별 성과:
- 화(5/5): 3/5 = 60%
- 수(5/6): 3/5 = 60%
- 목(5/7): 2/4 = 50%
- 금(5/8): 4/4 = 100% ← 최강
- 토(5/9): 2/4 = 50%
- 일(5/10): 1/5 = 20% ← 구조적 이상치

전체 n=94 격리:
- 비일요일: 45/89 = **50.6%** (baseline 근접, 모델 정상 작동)
- 일요일: 1/5 = **20.0%** (구조적 under-performance)
- → 일요일이 전체 48.9%를 1.7%p 끌어내리는 주범

## Reusability

스포츠/금융 예측 시스템 일반:
- **요일/계절/시간대 격리**: 정기적으로 시계열 예측 모델의 성과를 시간 차원으로 분해
- **구조적 이상치 제거 후 baseline 재측정**: 제거 후 숫자가 크게 달라지면 → 그 차원이 핵심 변수
- **실용 가이드**: "전체 정확도가 낮다" 결론 전 시간 차원(요일/월/시즌) 격리 먼저. 이 패턴 없이 가중치 전면 조정하면 정상 날들의 성과를 희생시킬 위험.

## 관련 데이터

- Sunday cap 0.55 이미 적용 (cycle 309, 2026-05-12)
- 일요일 n=5로 소표본 — n=15 이상 누적 후 통계 유의성 검정 권장
- 금요일 4/4 = 100% → n=4 소표본, 패턴 확정 전 추가 데이터 필요

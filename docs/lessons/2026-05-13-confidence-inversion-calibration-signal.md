# Anti-Pattern: 고확신 예측의 역설적 저성과 — 보정 미분류 신호

**카테고리**: anti_pattern / ai_agent  
**발견**: cycle 339 (2026-05-13), n=94 누적 분석

---

## Problem

앙상블 예측 모델(KBO 승부예측)에서 고확신 예측(≥0.5 confidence)이 저확신 예측(<0.5)보다 낮은 정확도를 보이는 지속적 패턴.

- 고확신(≥0.5): 38/79 = **48.1%** (무작위 기준선 50% 이하)
- 저확신(<0.5): 8/15 = **53.3%** (무작위 기준선 초과)
- W22 5/12 당일: 정답 2경기 모두 confidence=0.3, 오답 3경기 모두 0.45~0.52

이는 모델이 "확신이 높을수록 틀린다"는 역설을 보이며, 전형적인 calibration 과적합(overconfidence) 신호.

## Root Cause 가설

1. **Elo/lineup_woba 편향**: 가장 강한 팩터(lineup_woba 78.7%, elo 77.1%)가 모두 홈팀 우세를 적극 신호할 때 confidence가 높아짐 → 홈팀이 실제로 지는 경우에 고확신 오답 집중
2. **SFR 극단값 증폭**: sfr=0.0 또는 1.0 극단값이 confidence를 인위적으로 높이지만 실제 예측력은 낮음 (sfr 전체 방향 정확도 47.3%)
3. **에이전트 과신**: judge-agent가 이미 고확신인 정량 모델 결과를 추가 보정 없이 승인 → confidence 누적

## Solution (후보)

1. **Confidence 압축**: 최종 confidence = `0.5 + (raw_confidence - 0.5) * 0.7` — 극단값 완화
2. **저확신 트랙 별도 관리**: confidence < 0.35 예측을 "모델 불확실" 트랙으로 분리, 다른 전략 적용
3. **n=150 도달 후 calibration plot**: Expected Calibration Error(ECE) 측정 → 어느 구간에서 overconfidence 발생하는지 정확히 파악
4. **임시 대응 (현재)**: 일요일 confidence_clamp 0.55 (cycle 309) — 요일별 적용 방향

## Results

- n=94 기준 지속 관찰 중 (cycle 256, 290, 333, 337, 339 모두 동일 패턴 재확인)
- W21 고확신 복합: 화/수 고확신 4/7 = 57%, 일 고확신 1/5 = 20% → 요일 변수가 교란 가능
- 단순 가중치 조정만으로는 해결 불가 — calibration 레이어 필요

## Reusability

ML 분류 모델 일반:
- **Confidence-Accuracy inversion 감지 루틴**: `accuracy WHERE confidence >= threshold` vs `accuracy WHERE confidence < threshold` 비교를 정기 모니터링에 포함
- **Calibration plot 필수화**: Binary classifier에서 high-confidence bucket이 오히려 낮은 정확도 = 모델이 경쟁 상황(near 50/50)에서 과신 → Platt scaling 또는 isotonic regression 보정 고려
- **실용 가이드**: 스포츠 예측에서 "경기가 뻔할수록 모델이 맞힌다"는 가정은 틀림 — 뻔해 보이는 경기일수록 예측 오류 가능성 높음 (정보 비대칭, 선발 컨디션, 날씨 등 비정량 요소 증가)

## 관련 데이터

- 전체 Brier score: 0.2501 (n=89 기준, cycle 333)
- 이상적 Brier: <0.25 → 현재 살짝 초과
- n=150 도달 시 ECE 측정 + calibration curve 생성 예정

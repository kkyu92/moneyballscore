# cycle 1636 — op-analysis (lite) 23-cycle proactive gap (2026-W28 주간 성적)

**chain**: operational-analysis (lite)
**outcome**: success
**trigger**: 23-cycle gap from last op-analysis (cycle 1613 → 1636) — 25-cycle trigger 2 cycle 전 proactive fire

## 이번 주 성적 (2026-W28: 7/7-7/13)

| 날짜 | 예측 | 적중 | 적중률 | 비고 |
|---|---|---|---|---|
| 2026-07-07 | 5 | 2 | **40%** | CREDIT_EXHAUSTED, conf=0.3 flat |
| 2026-07-08 | 4 | 3 | **75%** | LLM active (debate=v1-narrative) |
| 2026-07-09 | 4 | 2 | **50%** | LLM active (1 pending: game 7762) |
| 합계 | 13 | 7 | **53.8%** | 2건 미검증 (7762, 7859) |

- 올스타 브레이크: 7/10-15 (경기 없음) → 7/16 시즌 재개

## 핵심 패턴

### CE vs LLM 비교 (이번 주 3번째 재확인)
- 7/7 CREDIT_EXHAUSTED (conf=0.3 flat): **2/5 = 40%**
- 7/8-9 LLM debate active: **5/8 = 62.5%** (+22.5pp)
- 누적 CE 58.8% (97/165) vs 비CE 63.8% (30/47) — cycle 1550 확정 +5.0pp 일관 유지

### 홈 vs 원정 예측 비대칭 (이번 주)
- hwp > 0.5 (홈팀 예측): **5/7 = 71%**
- hwp < 0.5 (원정팀 예측): **2/6 = 33%**
- 단 13건 소표본 (통계적 의미 낮음). 중기 데이터로 재확인 필요.

### hwp 구간별 성적
| hwp | 예측 | 적중 | 적중률 |
|---|---|---|---|
| > 0.56 | 1 | 1 | 100% |
| 0.52-0.56 | 5 | 3 | 60% |
| 0.48-0.52 | 5 | 2 | 40% |
| < 0.48 | 2 | 1 | 50% |

hwp가 높을수록 적중률 상승 = calibration 방향 일치

### 신뢰도 이상 (ongoing)
- conf 범위: 0.004~0.182 (LLM active 날)
- 정상 범위: 0.5-0.7 대비 10~100배 낮음
- 원인: CREDIT_EXHAUSTED 지속 → debate 시 극단 분포 압축

## 누적 측정

| metric | cycle 1549 (7/13 저녁) | cycle 1636 (7/14 아침) | delta |
|---|---|---|---|
| v1.8 n | 187 | 187 | 0 (올스타 브레이크) |
| v1.8 acc | 59.9% | 59.9% | 0 |
| v1.8 Brier | 0.2443 | 0.2488 | +0.0045 |

Brier 소폭 악화 (+0.0045): 이번 주 53.8% < 59.9% 누적 → 자연 회귀 (소표본). 구조적 변화 아님.

## 가중치 조정 판단

**NO CHANGE** — v1.8 유지 확정 (cycle 1460, Brier DEFAULT 0.2443 vs Learned 0.2458 차이 < 1pp).

이번 주 13건 소표본으로 조정 결정 불가. CREDIT_EXHAUSTED 재소진 지속 = 크레딧 충전 후 LLM 성능 재측정 필요.

## 다음 cycle 후속 후보

- op-analysis 25-cycle trigger: cycle 1638 (2 cycle 후) 자연 도달 — 7/16 시즌 재개 후 새 데이터 누적 시
- CREDIT_EXHAUSTED 사용자 크레딧 충전 대기 (carry-over)
- 7/16 시즌 재개 후 5경기 예측 성적 모니터

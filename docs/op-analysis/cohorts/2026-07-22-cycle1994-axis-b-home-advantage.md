# op-analysis heavy — 축 B HOME_ADVANTAGE 조건부 보정 (cycle 1994)

cycle 1547 spec 축 B 후속. 착수 조건: N ≥ 100 CE cohort 축적. 최초로 임계 충족 (CE proxy n=162, `v1.8-credit-fail` strict label n=26 — strict label 은 cycle 1500 이후 사실상 정체, 실측은 CE proxy(`scoring_rule='v1.8' AND debate_version IS NULL`) 로 진행).

## 데이터 (2026-07-22, KBO league, home_win_prob NOT NULL, is_correct NOT NULL, 무승부 제외)

| cohort | n | 실제 홈승률 | 예측 평균 hwp | 박빙구간[0.47,0.53] n | 박빙구간 실제 홈승률 |
|---|---|---|---|---|---|
| 전체 | 209 | 52.6% | 51.6% | 103 | 55.3% |
| CE (fallback, quant only) | 162 | 49.4% | 51.9% | 87 | 50.6% |
| 비CE (LLM debate) | 47 | 63.8% | 50.4% | 16 | 81.3% |

## 판단

**축 B 후보 3개 재평가**:

- **B-1 (HOME_ADVANTAGE 0.015→0.02 상향)**: 기각. CE 코호트(순 quant, LLM 영향 없음, n=162)의 실제 홈승률(49.4%)이 예측 평균(51.9%)보다 오히려 **낮음** — 상향 조정 시 과대보정 방향. 상향을 지지할 근거 없음.
- **B-2 (박빙 구간 조건부 boost)**: 기각. 박빙 구간(hwp 0.47~0.53) CE n=87 실제 홈승률 50.6% = 순수 동전던지기 수준. "박빙일 때 홈팀이 더 이긴다"는 가설을 지지하는 신호 없음.
- **B-3 (무변경)**: **채택**. CE 코호트 전체 지표가 현재 HOME_ADVANTAGE=0.015 가정과 오차범위 안(2.5pp, n=162 기준 노이즈 수준)에서 일치. 상향/조건부 보정 모두 데이터가 뒷받침 안 함.

**비CE(LLM debate) cohort 관찰**: 실제 홈승률 63.8%가 예측 평균(50.4%)보다 크게 높음(+13.4pp). 그러나 n=47 (박빙구간 n=16)으로 표본 너무 작아 결론 도출 불가 — LLM debate가 홈팀에 유리한 편향을 갖는지 여부는 **판단 보류** (추가 축적 필요, 별도 후속 항목).

## 결론

**축 B 종결 — HOME_ADVANTAGE=0.015 무변경 확정 (B-3).** 첫 N≥100 CE 실측으로 v1.8 유지 결정(cycle 1460/1500)을 재확인. cycle 1547 spec 이후 반복 carry-over(각 milestone `op-analysis 축 B HOME_ADVANTAGE 조건부 사용자 결정 carry-over`) 해소.

비CE 홈승률 편향(+13.4pp, n=47)은 별도 관찰 항목으로 분리 — n 부족으로 결정 X, 추가 축적 후 재평가.

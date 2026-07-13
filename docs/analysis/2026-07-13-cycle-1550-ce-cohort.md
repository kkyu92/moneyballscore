# op-analysis CE cohort 분석 (2026-07-13, cycle 1550)

cycle 1547 spec 축 A — CE(CREDIT_EXHAUSTED) vs 비CE 10.4pp 격차 원인 규명 heavy retrospective.

## CE 판별 기준

- CE = `scoring_rule='v1.8-credit-fail'` OR (`scoring_rule='v1.8'` AND `debate_version IS NULL`)
- 비CE = `scoring_rule='v1.8'` AND `debate_version='v2-persona4'`

## 1. 전체 vs CE vs 비CE

- **전체**: 59.9% (127/212) Brier=0.3001
- **CE**: 58.8% (97/165) Brier=0.3134
- **비CE**: 63.8% (30/47) Brier=0.2534

**격차 (비CE − CE) = 5.0pp**

## 2. 월별 CE / 비CE 분포 (temporal bias check)

| 월 | CE n | CE acc | 비CE n | 비CE acc |
|---|---|---|---|---|
| 2026-05 | 36 | 52.8% | 31 | 64.5% |
| 2026-06 | 95 | 62.1% | 15 | 66.7% |
| 2026-07 | 34 | 55.9% | 1 | 0.0% |

## 3. 팀별 CE 정확도 (팀 편중 check)

| team_id | CE n | CE acc | 비CE n | 비CE acc |
|---|---|---|---|---|
| 1 | 31 | 54.8% | 11 | 81.8% |
| 2 | 33 | 57.6% | 11 | 72.7% |
| 3 | 34 | 64.7% | 10 | 60.0% |
| 4 | 36 | 55.6% | 9 | 55.6% |
| 5 | 33 | 51.5% | 8 | 50.0% |
| 6 | 36 | 69.4% | 6 | 66.7% |
| 7 | 32 | 56.3% | 11 | 63.6% |
| 8 | 31 | 58.1% | 8 | 62.5% |
| 9 | 31 | 51.6% | 10 | 40.0% |
| 10 | 33 | 66.7% | 10 | 80.0% |

## 4. Same-day mixed cohort (CE + 비CE 공존 날짜)

**mixed days = 12**

| 날짜 | CE n | CE acc | 비CE n | 비CE acc |
|---|---|---|---|---|
| 2026-05-16 | 3 | 66.7% | 2 | 50.0% |
| 2026-05-17 | 4 | 50.0% | 1 | 0.0% |
| 2026-05-24 | 2 | 100.0% | 3 | 66.7% |
| 2026-05-26 | 2 | 50.0% | 1 | 100.0% |
| 2026-05-27 | 1 | 100.0% | 4 | 50.0% |
| 2026-05-28 | 3 | 66.7% | 2 | 50.0% |
| 2026-05-29 | 1 | 0.0% | 4 | 75.0% |
| 2026-05-30 | 2 | 100.0% | 3 | 100.0% |
| 2026-05-31 | 3 | 66.7% | 2 | 100.0% |
| 2026-06-02 | 1 | 0.0% | 4 | 100.0% |
| 2026-06-05 | 3 | 100.0% | 2 | 50.0% |
| 2026-07-01 | 3 | 0.0% | 1 | 0.0% |

## 5. 원인 진단

### (a) LLM 부가가치 가설

- CE = LLM 실패 (순 quant) / 비CE = LLM 성공 (quant + debate shift)
- 순 quant base rate 는 CE acc 로 관측됨
- 격차 5.0pp 가 순수 LLM 부가가치 (temporal bias 배제 시)

### (b) temporal bias 가설

- CE 는 특정 월 (2026-05 credit 소진기) 편중 여부 = 월별 표 참조
- 만약 CE 월과 비CE 월 이 완전 분리 → base rate 자체 시기 차이 가능
- CE 월 수: 3 / 비CE 월 수: 3 / **overlap 월 수: 3**
  - overlap: 2026-05, 2026-06, 2026-07
  - overlap 월 안 격차 (temporal 통제): 5.0pp (CE 58.8% / 비CE 63.8%)
  - overlap 격차 ≈ 전체 격차 → LLM 부가가치 우세 / overlap 격차 <<  전체 격차 → temporal bias 우세

### (c) 결론

- 위 진단 (a) / (b) 조합 검토 → 다음 cycle plan #24 draft input.

---

자동 생성 — cycle 1550 op-analysis (heavy). `scripts/op-analysis-ce-cohort.ts`.
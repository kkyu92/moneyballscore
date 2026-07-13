# cycle 1547 — W28 CE / Elo / scoring_rule 후속 spec

**작성**: 2026-07-13, cycle 1547, chain=explore-idea (lite)
**motive**: cycle 1545 op-analysis (lite) 3 lesson + cycle 1546 review-code (heavy) wave-245 stale filter 정리 후속. 다음 op-analysis heavy 또는 fix-incident 발화 시 착수 근거.
**status**: draft (사용자 review 대기 X, 다음 발화 자연 참조)

---

## carry-over 원천 (본 spec 참조 source)

1. `37f50796` lesson: extract-pattern 3건 (cycle 1545)
   - **P1** `credit-exhausted-dilutes-accuracy` — CE(conf=0.3) 56.3% vs 비CE 66.7% = 10.4pp 격차, scoring_rule='v1.8-credit-fail' 분리 집계 필수
   - **P2** `elo-fallback-home-advantage-neutralized` — CREDIT_EXHAUSTED 시 quant hwp 0.46~0.56 박빙 → HOME_ADVANTAGE +1.5% 보정 방향 역전 불가, W28 CE 구간 홈 예측 실패 4건
   - **P3** `db-filter-scoring-rule-not-model-version` — debate_version 필터 시 CE row null 제외 → 35일 Elo 공백, PRODUCTION_COHORT_RULES IN 패턴 안전
2. `e3207f54` W28 weekly-review data (7/13 = 53.8%, CE 40% vs 비CE 62.5%)
3. `f608caab` fix(context) wave-245 — apps/moneyball/src/app/page.tsx L469 + L506 stale debate_version filter 제거 (cycle 1546)
4. cycle 1460 Fable plan #16 (v1.8 유지 확정) + cycle 1500 milestone (v1.8-credit-fail split Brier 0.2304 = fallback 저하 원인 확정)

---

## 3 축 후속 candidate (사용자 결정 대기 / 다음 op-analysis heavy 자율)

### 축 A — v1.8-credit-fail split baseline 활용 (op-analysis heavy 후보)

**질문**: fallback 경로 (conf=0.3, LLM debate 실패) 도 quant + HOME_ADVANTAGE 는 그대로 통과. 그럼에도 CE 구간 정확도 10.4pp 하락. 원인 후보:
- (a) LLM debate 자체가 결정 정보 (선발 상태 / 부상 / 최근 폼) 를 반영해 quant 를 넘어서는 shift 을 만들었다면 → LLM 제거 시 순 quant 성능 = 실제 base rate → 10.4pp 는 LLM 부가가치의 척도
- (b) 아니면 CE 구간 = 특정 시기 (예: 특정 팀 injuries surge, 특정 season phase) 편중 → 시기 편차 (temporal cohort bias)
- (c) 아니면 조합 (LLM 부가가치 + temporal bias)

**필요 데이터**:
- v1.8 vs v1.8-credit-fail same-day 매치 예측 delta 분포 (n=?)
- CE 구간 날짜 분포 (히스토그램) vs 비CE 날짜 분포
- CE 구간 팀별 정확도 (특정 팀 shift?)

**착수 조건**:
- 사용자 Anthropic 크레딧 충전 후 CE 구간 축소 X — retrospective analysis 만 가능
- op-analysis heavy 발화 시 첫 target

### 축 B — HOME_ADVANTAGE 조건부 보정 (fix-incident 후보 — 실측 evidence 축적 시)

**P2 세부**: CREDIT_EXHAUSTED → quant homeWinProb 0.46~0.56 (박빙) → 홈 +1.5% 로 방향 역전 부족.

**현 코드** (packages/kbo-data/src/engine/predictor.ts L134~140):
```typescript
let homeWinProb = factorTotal > 0 ? weightedSum / factorTotal : 0.5;
homeWinProb += HOME_ADVANTAGE;   // 0.015 constant
homeWinProb = clampWinnerProb(homeWinProb);
```

**candidate 옵션 (사용자 판단 필수 — 실측 baseline 없이 자율 shift X)**:
- **B-1**: HOME_ADVANTAGE 를 0.015 → 0.02 상향 (N=2180 cycle 2026-04-21 측정) — 상향 재측정 필요
- **B-2**: 박빙 구간 (hwp ∈ [0.47, 0.53]) 에 한해 추가 gradient 부여 (조건부 boost)
- **B-3**: 무변경 (실제 base rate 반영 = 이 정도가 최선) — v1.8 유지 확정 (cycle 1460) 근거

**risk (rubric)**: risk=2 (결정 위험, N=39 CE cohort 너무 작아 baseline shift 결정 X — cycle 1500 R8 사용자 결정 이행 v1.8 유지 확정 정합)

**착수 조건**:
- N ≥ 100 CE cohort 축적 (v1.8-credit-fail scoring_rule)
- op-analysis heavy 로 축 A 결론 확보 후

### 축 C — n=178 vs n=165 표본 미스매치 원인 규명 (review-code lite 후보)

**CLAUDE.md 박제** (2026-07-13 시점): cycle 1460 측정 n=178 vs cycle 1545 DB 실측 n=165 (-13). 원인 미규명 (가설: shadow/postview 포함 여부 차이).

**진단 step**:
1. `select scoring_rule, count(*) from predictions where predicted_at >= '2026-XX' group by 1` DB 실측
2. shadow rows (`v2.0-shadow` / `v2.1-B-shadow`) 필터링 in cycle 1460 count
3. postview_daily / retro backfill rows 포함 여부 확인
4. 결론 = CLAUDE.md 박제 갱신

**risk**: risk=0 (측정만, 결정 X)

---

## Tier 분류 (5축 rubric)

| 축 | 가치 | 시간 | risk | 자율 | 의존 | Tier |
|---|---|---|---|---|---|---|
| A | high (10.4pp 원인 규명) | medium (1 heavy op-analysis) | 2 | partial (사용자 크레딧 대기 X, retro OK) | 단일 (CE cohort N) | Tier 2 |
| B | high (모델 shift) | large | 2 | no (사용자 결정 필수, R8 정합) | 다중 (A 결론 + CE cohort N) | Tier 3 |
| C | medium (박제 정합) | small (1 lite review-code) | 0 | yes | none | Tier 1 |

**즉시 fire 후보**: 축 C (Tier 1) — 다음 review-code (lite) 또는 op-analysis (lite) 발화 시 자연 target.

**carry-over 후보**: 축 A (op-analysis heavy 발화 시) / 축 B (사용자 결정 대기).

---

## self_verification

- rubric: 5축 (가치 / 시간 / risk / 자율 / 의존) 적용
- 자가 의심 X (rubric 객관 evidence only)
- 100 cycle 의미 판단 X — 사용자 결정만 stop 신호
- 축 A/B/C 배타 X — 순서 = C (측정) → A (원인) → B (결정)

## 다음 cycle 후속 후보

- **축 C 착수**: n=178 vs n=165 원인 규명 (review-code lite 자연 발화 시 grep 진단 → CLAUDE.md 박제 갱신) — 표본 정합 layer
- **축 A carry-over**: op-analysis heavy 발화 시 CE cohort 분포 히스토그램 + 팀별 CE 정확도 산출
- **plan #24 draft**: 축 A+B 결론 완성 후 v1.8 → v2.0 (또는 v1.8 stay) 최종 결정 plan

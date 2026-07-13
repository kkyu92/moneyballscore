# cycle 1561 — 축 A/C 완료 후속 forward spec

**작성**: 2026-07-13, cycle 1561, chain=explore-idea (lite)
**motive**: cycle 1547 spec (축 A/B/C 3분) 이후 축 A (cycle 1550 op-analysis heavy) + 축 C (cycle 1549 review-code heavy) 완료. 잔여 = 축 B 사용자 결정 대기 + 축 D 신규 forward path. improvement saturation trigger (직전 15 사이클 review-code+fix-incident+polish-ui+info-arch 12/15 = threshold) fire → 신규 direction 점검.
**status**: draft (사용자 review 대기 X, 다음 발화 자연 참조)

---

## 완료된 축 결과 요약

### 축 A — LLM 부가가치 원인 규명 (cycle 1550 op-analysis heavy 완료)

**질문**: CE 구간 정확도 하락 = LLM 부가가치 vs temporal bias?

**결과** (`scripts/op-analysis-ce-cohort.ts` 산출, cycle 1550):
- CE 58.8% (97/165) vs 비CE 63.8% (30/47) = **5.0pp** (초기 W28 10.4pp → n=212 전체 표본 재측정 시 5.0pp)
- overlap 월 3/3 (2026-05/06/07) 격차 = 전체 격차 identical → **temporal bias 배제**
- Brier CE 0.3134 vs 비CE 0.2534 → **LLM 부가가치 우세 결론** (LLM debate conf 활용 shift 부가가치)

**P4 새 패턴 (cycle 1550)**: CE 판별 hybrid criteria
- `scoring_rule='v1.8-credit-fail'` 단독 = n=25 부족
- `scoring_rule='v1.8' AND debate_version IS NULL` 조건 추가 → 실제 n=165
- 140건 backfill 미완료 (cohort-cleanup.ts 잔여) — 다음 op-analysis 시 재확인

### 축 C — n regime mismatch 원인 규명 (cycle 1549 review-code heavy wave-247 완료)

**결과** (methodology page 하드코딩 n 제거):
- n=178 (cycle 1460, 7/6) / n=165 (cycle 1545, 7/13 오전) / n=187 (cycle 1549, 7/13 저녁) = 각 **시점별 스냅샷**
- shadow rows (v2.1-B n=52 + v2.0 n=5) = 별개 cohort
- v1.8-credit-fail (n=25 acc 60.0%) = CE fallback split
- **결론**: 자연 시간 흐름 + shadow/cohort 분리. 표본 미스매치 X.

**wave-247 코드 변경**: methodology page 하드코딩 n=178 제거 → /accuracy 실시간 참조. silent drift 재발 차단.

---

## 잔여 축 B — 사용자 결정 대기 (변경 X)

축 B = HOME_ADVANTAGE 조건부 보정. 축 A 결론 (LLM 부가가치 우세) 확보 후 재평가:

- **B-1** (HOME_ADVANTAGE 0.015→0.02): 재측정 baseline 필요 (N=2180 cycle 2026-04-21 이후 N 축적 완료 시)
- **B-2** (박빙 구간 조건부 gradient): risk=2, 결정 evidence 부족
- **B-3** (무변경): v1.8 유지 확정 (cycle 1460) 정합, 축 A 결론 = LLM 부가가치 확인 → 정량 quant 는 base rate 반영 유지

**축 A 결론 반영**: LLM 부가가치가 CE 격차의 원인이라면, HOME_ADVANTAGE 자체 shift 필요성 감소. B-3 (무변경) 우세 방향.

**착수 조건 변경**:
- ~~축 A 결론 확보 후~~ → **완료 (cycle 1550)**
- **다음**: N ≥ 100 CE cohort 축적 (cycle 1550 시점 n=25 v1.8-credit-fail + n=140 v1.8+debate_null 조합 = n=165)
- N=165 이미 확보 → **사용자 결정 대기 layer 만 남음**

---

## 신규 축 D — LLM debate 복구 후 CE cohort 자연 축소 monitor (op-analysis lite 후보)

**motive**: CREDIT_EXHAUSTED 6th recurrence (cycle 1500 phase 갱신). 사용자 Anthropic 크레딧 충전 이행 대기. 충전 이행 시 debate 재활성 → CE cohort 자연 축소 (신규 predictions 대부분 debate 성공 → scoring_rule='v1.8').

**측정 target**:
1. **debate 성공률 회복**: 신규 predictions 중 `debate_version IS NOT NULL` 비율 (충전 전 ~20% → 충전 후 ~90%+ 예상)
2. **CE cohort 신규 유입 rate**: cycle 1550 시점 n=165 CE. 충전 후 delta N 신규 CE < 5/week (거의 정체)
3. **overall Brier 변화**: CE 신규 유입 정체 → 비CE 표본 우세 → 전체 Brier 개선 (0.30 → 0.26 방향)

**필요 데이터**:
- `sp_log` 또는 `pipeline_runs` daily debate 성공/실패 rate
- 주간 신규 predictions cohort 분포

**risk (rubric)**: risk=0 (측정만, 결정 X)

**착수 조건**:
- 사용자 Anthropic 크레딧 충전 이행 (본 메인 자율 X — 사용자 영역)
- 충전 이행 확인 후 7일 이상 신규 debate 성공률 축적 시 op-analysis lite 자연 발화

### 축 E — CE cohort backfill 140건 재확인 (review-code lite 후보 — carry-over)

**motive**: cycle 1550 op-analysis heavy P4 새 패턴 = "140건 backfill 미완료 (cohort-cleanup.ts 잔여)".

**진단 step**:
1. `scripts/cohort-cleanup.ts` 실행 결과 확인 (`--dry-run` 우선)
2. backfill 결과 = `scoring_rule='v1.8' AND debate_version IS NULL` 조건 만족 row 를 `v1.8-credit-fail` 로 재분류 여부 결정
3. 재분류 시 CE cohort 정합 명확화 (hybrid criteria → 단일 criteria)

**risk (rubric)**: risk=1 (backfill = 과거 데이터 변경, 재측정 baseline 이동 위험). dry-run 우선 필수.

**착수 조건**:
- 축 D 자연 측정 완료 (충전 이행 + 7일 debate 재활성 monitor) 후
- 또는 사용자 명시 결정

---

## Tier 분류 (5축 rubric — 갱신)

| 축 | 가치 | 시간 | risk | 자율 | 의존 | Tier | 상태 |
|---|---|---|---|---|---|---|---|
| A | high (5.0pp 원인 규명) | medium | 2 | partial | 단일 | Tier 2 | ✅ cycle 1550 완료 |
| B | high (모델 shift) | large | 2 | no (사용자) | 다중 | Tier 3 | ⏸ 사용자 결정 대기, B-3 우세 방향 |
| C | medium (박제 정합) | small | 0 | yes | none | Tier 1 | ✅ cycle 1549 완료 |
| **D** | medium (CE cohort 자연 축소 monitor) | small (1 lite op-analysis) | 0 | partial (충전 대기 X, retro OK) | 단일 (사용자 크레딧) | Tier 2 | 🆕 사용자 크레딧 충전 후 |
| **E** | low (backfill 정합) | small (1 lite review-code, dry-run) | 1 | partial (dry-run OK, 재분류 사용자 결정) | 단일 (축 D 결과) | Tier 2 | 🆕 축 D 완료 후 또는 사용자 결정 |

**즉시 fire 후보**: 없음 (모두 사용자 크레딧 or 사용자 결정 대기).

**carry-over 후보**:
- 축 D — 다음 op-analysis lite 발화 시 (사용자 크레딧 충전 확인 후)
- 축 E — 다음 review-code lite 발화 시 (축 D 완료 후 또는 사용자 명시)
- 축 B — 사용자 결정 명시 시 (본 메인 자율 X)

---

## self_verification

- **rubric**: 5축 (가치 / 시간 / risk / 자율 / 의존) 적용
- **자가 의심 X** (rubric 객관 evidence only, 100 cycle 의미 판단 X — 사용자 결정만 stop 신호)
- **축 A 결론 근거**: cycle 1550 `scripts/op-analysis-ce-cohort.ts` 산출 = temporal bias 배제 + Brier CE 0.3134 vs 비CE 0.2534 → LLM 부가가치 우세 결론. 결정 X, evidence 만.
- **축 B baseline 이동 자율 X**: cycle 1500 R8 사용자 결정 이행 v1.8 유지 확정 정합. v1.8 stay = 축 A 결론 (LLM 부가가치 확인) 반영 → B-3 우세 방향 hint 만, 결정 X.
- **축 D/E 자율 fire 조건**: 사용자 크레딧 충전 이행 (D), dry-run only (E). 재분류 결정은 사용자 영역.

## 다음 cycle 후속 후보 (carry-over 채널 — 20 cycle window)

- **축 D**: 사용자 Anthropic 크레딧 충전 이행 후 op-analysis lite 발화 시 debate 성공률 + CE cohort 신규 유입 rate 측정
- **축 E**: 축 D 완료 후 또는 사용자 명시 시 review-code lite 발화, `scripts/cohort-cleanup.ts --dry-run` 실행 → 재분류 안전성 진단
- **plan #24 draft** (변경 X, cycle 1547 spec 정합): 축 A+B+D 최종 결과 통합 시 v1.8 → v2.0 (또는 v1.8 stay) 최종 결정 plan. 현 시점 = B-3 (v1.8 stay) 우세 방향 hint 만

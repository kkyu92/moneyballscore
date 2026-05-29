# op-analysis lite cohort 측정 — cycle 1057 (2026-05-29)

## 측정 요약

**총 n=205** (적중 105 / 51.2%) — cycle 1038 측정값 동일, delta=0

| rule | n | acc | Brier | cycle 1038 대비 delta |
|---|---|---|---|---|
| v1.5 | 16 | 75.0% | 0.2131 | 0 |
| v1.6 | 46 | 37.0% | 0.2606 | 0 |
| v1.7-revert | 34 | 55.9% | 0.2652 | 0 |
| v1.8 | 27 | 44.4% | 0.2487 | 0 |
| v1.8-credit-fail | 25 | 60.0% | 0.2304 | 0 |
| v2.0-shadow | 5 | 60.0% | 0.5616 | 0 |
| v2.1-B-shadow | 52 | 51.9% | 0.4635 | 0 |

## 발견 — gap 19 cycle ≠ 4일 신선도

cycle 1038 started_at = `2026-05-29T12:30:00Z` (KST 21:30).
cycle 1057 측정 = 2026-05-29 약 22:00 KST.
gap 19 cycle = 약 30분 ~ 1시간 (zero-touch 자동 fire 속도 ≈ 3분/cycle).

cycle 1038 retro 박제 "4일만에 갱신 (cycle 886 → 1038)" 의 "4일" 추정 = stale 또는 cycle 886 시점 측정값 자체가 KST 기준 4일 전이 아닐 가능성 (started_at 부재로 확인 불가).

**핵심**: op-analysis cohort 측정 freshness 기준 (gap N cycle) 이 KST 시간 gap 과 디커플링. 자동 fire 환경 = 약 3분/cycle → 25 cycle ≈ 75분, 19 cycle ≈ 57분. trigger 6 (25 cycle gap lite 자동 권장) 의 의미가 zero-touch 환경에서 = 약 1시간 후 재측정 = 데이터 부족 partial 강제.

## 후속 검증 carry-over

- cycle 886 KST timestamp 확인 (cycles/886.json started_at 부재 → CHANGELOG 또는 git log baseline 검증 필요)
- trigger 6 정의 보강 후보: KST 시간 gap 기준 (예: 24시간 미경과 시 skip)
- 본 mismatch = skill-evolution trigger 4 ("SKILL 갱신 필요") 후보 — meta-pattern dispatch 처리

## lesson

op-analysis lite 의 gap N cycle freshness trigger 가 자동 fire 속도 (3분/cycle) 환경 = 데이터 신선도 (1일/72건 verified 추가 속도) 와 디커플링. cycle 1038 success 직후 19 cycle (~1시간) 만 = delta=0 강제 partial.

# cycle 80 — sfr H1a 첫 코드 변경 후보 spec (cycle 56 carry-over)

**작성**: 2026-05-06 (cycle 80)
**chain**: explore-idea (lite — spec only)
**carry-over**: cycle 56 sfr/h2h systematic bias spec (`2026-05-05-cycle-56-sfr-h2h-weight-rebalance.md`) 의 sfr 차원 첫 step.

## 배경

cycle 56 = sfr/h2h 가중치 재배분 후보 A/B/C 박제 (sfr 5% → 3%/0%/0%). cycle 67/69 = h2h 차원 첫 step (h2hMinN 파라미터화 = 후보 D). **sfr 차원 첫 코드 변경 미진행**.

cycle 56 spec 의 결정 기준 ("3개 모두 충족 시만 PR — backtest 5 + bootstrap CI + prod sfr/h2h bias CI") 미충족 → ship 차원 진행 X. 그러나 **검증 path 자체** 가 코드 변경 0건 = h2h 차원의 후보 D 같은 단순 path 부재. 본 spec 이 그 갭 박제.

## 후보 (sfr 첫 코드 변경 path, 가장 단순 → 복잡 순)

### D1) sfr feature flag 추가

**변경**: `DEFAULT_WEIGHTS` 옆에 `SFR_ENABLED = true` const 추가. `predictor.ts:90` 의 `factors.sfr = normalize(...)` 를 `factors.sfr = SFR_ENABLED ? normalize(...) : 0` 로.

**Pros**:
- prod 영향 0 (default true 유지)
- env override 시 sfr 0 가중치 모드 검증 가능
- 검증 환경에서 SFR_ENABLED=false 만 toggle = sfr 효과 측정

**Cons**:
- feature flag 1개 추가 = 코드 누적
- 운영 SFR_ENABLED=false 영구 사용 시 flag 가 dead code

**Effort**: 1 PR, 5 line 변경, 회귀 가드 테스트 1건

### D2) sfr 가중치 5% → 4% (보수적 축소 첫 step)

**변경**: `DEFAULT_WEIGHTS.sfr: 0.05` → `0.04`. 다른 가중치 sum 1.0 보존 위해 다른 영역 +0.01 (예: bullpen_fip 0.10 → 0.11).

**Pros**:
- prod 즉시 적용 가능
- cycle 56 후보 A (보수적 축소) 와 정렬

**Cons**:
- 회귀 가드 부족 시 silent drift 위험
- backtest 측정 결과 미검증 → R8 위반

**Effort**: 1 PR, 2 line 변경, 결정 기준 미충족 → 비추천

### D3) sfr 분기 path (shadow variants)

**변경**: `predictor.ts` 에 `predictWithVariants()` 함수 추가. `{ baseline, sfr_zero, sfr_reduced }` 세 variant 동시 계산. shadow A/B 인프라 (cycle 75 H2 사용자 결정 후 ship) 위에서 실측.

**Pros**:
- 모든 variant 동시 측정
- prod baseline 영향 0

**Cons**:
- 사이클 75 shadow A/B 인프라 prerequisite (사용자 결정 대기)
- LLM 호출 추가 0 (predictor.ts 만 분기) — OK

**Effort**: shadow A/B 인프라 ship 후 1 PR

## 권장 (cycle 56 결정 기준 R8 + cycle 75 carry-over 통합)

**D1 (feature flag) 우선** — prod 영향 0 + 검증 path 즉시 열림. cycle 75 H2 사용자 결정 전이라도 ship 가능. 검증은 사용자가 환경변수로 toggle.

**D3 (shadow variants)** = cycle 75 사용자 결정 후 자연 후속. 모든 variant 동시 측정 = 진정한 R8 충족.

**D2 (가중치 변경)** = R8 미충족 → 비추천 (cycle 56 결정 기준 위반).

## 결정 기준 (R8 적용)

D1 ship 시:
- backtest harness 5 (이미 존재 — `backtest-bootstrap-ci-run.ts` / `backtest-manual-weights-run.ts`) 에 `sfrEnabled?: boolean` 옵션 추가
- SFR_ENABLED=false 모드 backtest 결과가 baseline 대비 ±N% 이내 (cycle 56 spec 의 결정 기준 그대로)
- prod 신선 데이터 누적 후 (사용자 결정 — 30일 이상 권장)

## 위험

- D1 feature flag 가 dead code 화 — cycle 56 결정 (가중치 변경 / shadow 유지 / 폐기) 시점에 flag 정리 강제
- D2 silent drift — 회귀 가드 없이 prod 가중치 변경 = R8 위반 (cycle 56 박제)
- D3 prerequisite 의존 — cycle 75 H2 사용자 결정 미정 → ship X

## 다음 사이클

- cycle 81+: D1 ship 또는 cycle 75 사용자 결정 우선
- cycle 82+: shadow A/B 인프라 ship 후 D3 자연
- cycle 95+: 30일 신선 데이터 후 cycle 56 결정 기준 측정 (operational-analysis heavy)

## carry-over chain

- cycle 56 → cycle 67 (h2h H1b spec) → cycle 69 (h2hMinN ship)
- cycle 56 → cycle 75 (shadow A/B H2 spec) → 사용자 결정 대기
- **cycle 56 → cycle 80 (sfr H1a spec) → 81+ ship 또는 prerequisite 대기**

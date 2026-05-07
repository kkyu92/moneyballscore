# Anti-Pattern: normalize() 음수 입력값 미처리

**카테고리**: anti_pattern  
**발견**: cycle 207 operational-analysis (2026-05-07)  
**수정**: cycle 208 fix-incident (2026-05-07) — Option B (차이 기반 정규화) 적용 완료 (PR #195)  
**파일**: `packages/kbo-data/src/engine/predictor.ts`

## 문제

```typescript
function normalize(homeVal: number, awayVal: number, higherIsBetter: boolean): number {
  if (homeVal === 0 && awayVal === 0) return 0.5;
  const total = Math.abs(homeVal) + Math.abs(awayVal);
  if (total === 0) return 0.5;

  if (higherIsBetter) {
    return homeVal / total;  // ← homeVal이 음수면 결과값 < 0
  }
  return awayVal / total;
}
```

`higherIsBetter=true` + `homeVal` 음수 입력 시: `homeVal / (|homeVal| + |awayVal|)` → 음수 결과.

예: homeVal=-5, awayVal=3 → total=8 → factor = -5/8 = **-0.625**

## 원인

SFR (Stolen Base Runs Above Average 또는 Defensive Runs Saved) 은 KBO Fancy Stats에서  
평균 대비 상대값으로 음수 가능. `KBO_TEAMS` 에서 `sfr` 컬럼이 raw KBO stat 그대로 입력됨.

```typescript
factors.sfr = normalize(input.homeTeamStats.sfr, input.awayTeamStats.sfr, true);
// homeTeamStats.sfr = -7.9 (평균 이하 수비) → factor = -7.9/(7.9+3.2) = -0.71
```

## 현황

72건 검증 예측 중 6건 sfr 팩터 음수 (min=-0.833). SFR 가중치 5%이므로:
- 단일 경기 영향: |factor_error| × 0.05 = 최대 0.042 (홈팀 확률 ±4.2pp)
- Brier 영향: ≈ 0.0002 (미미)

## 해결 방법

**Option A — 클램핑 (단순, 즉시 적용 가능)**
```typescript
// higherIsBetter + 음수 → 0 처리 (평균 이하 = 중립으로 간주)
const homeNorm = higherIsBetter ? Math.max(0, homeVal) : homeVal;
const awayNorm = higherIsBetter ? awayVal : Math.max(0, awayVal);
```

**Option B — 차이 기반 정규화 (더 정확, 음수 유지)**
```typescript
// (home - away) / (|home| + |away| + ε) → [-1, 1] → [0, 1]
const diff = higherIsBetter ? homeVal - awayVal : awayVal - homeVal;
const scale = Math.abs(homeVal) + Math.abs(awayVal);
if (scale === 0) return 0.5;
return (diff / scale + 1) / 2;
```

Option B가 개념적으로 더 정확하나, 기존 0~1 기반 테스트 케이스 수정 필요.
Option A는 "음수 SFR = 평균 수비 (중립)" 의미로 pragmatic하게 적용 가능.

## 교훈

1. **단순 비율 정규화는 양수 가정**: `a / (a + b)` 패턴은 a, b ≥ 0 전제. KBO stat은 음수 가능.
2. **팩터 범위 검증 누락**: predictor.ts에 팩터값 [0,1] 범위 assertion 없음 → 음수 값이 가중합에 조용히 섞임.
3. **측정이 먼저**: 72건 실제 데이터 분석 전까지 이 버그 미발견. Brier는 미미해서 성능 저하 없이 잠복.

## 관련

- `packages/kbo-data/src/engine/predictor.ts` line 90 (`sfr` normalize 호출)
- `packages/kbo-data/src/engine/__tests__/predictor.test.ts` — 음수 sfr 입력 케이스 테스트 추가 필요

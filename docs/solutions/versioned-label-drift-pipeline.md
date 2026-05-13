# Anti-Pattern: Versioned Label Drift After Model Upgrade

**카테고리**: anti_pattern / data_pipeline  
**발견**: cycle 334 (postview scoring_rule) + cycle 340 (predictor.ts model_version)  
**수정**: cycle 334 (PR #323) + cycle 340 (PR #362)

---

## 문제 (Problem)

ML 파이프라인에서 가중치(하이퍼파라미터) 파일이 변경될 때, 파이프라인 로깅 코드의 version label 문자열이 자동으로 갱신되지 않는다.

**발생 구조**:
```
packages/shared/src/constants/weights.ts  ← 가중치 정의 (변경됨)
packages/kbo-data/src/pipeline/daily.ts   ← scoring_rule: 'v1.7-revert' (미변경!)
packages/kbo-data/src/engine/predictor.ts ← model_version: 'v1.7-revert' (미변경!)
```

**증상**:
- DB에 구 버전 라벨로 예측이 저장됨
- model-comparison 대시보드가 v1.7-revert 그룹에 v1.8 예측을 묶어서 표시
- v1.8 전후 Brier 비교 불가능 → 가중치 개선 효과 측정 실패

**사례 2건**:
1. cycle 334: `postview-daily.ts`에서 `scoring_rule: 'v1.6'` 하드코딩 — post_game row가 구 버전으로 기록됨
2. cycle 340: `predictor.ts`의 `model_version` fallback이 `'v1.7-revert'` — debate 실패 시 fallback 예측이 구 버전으로 기록됨

---

## 원인 (Root Cause)

1. **버전 라벨 이중 관리**: 가중치 정의 파일(constants/weights.ts)과 파이프라인 로깅 코드(daily.ts, predictor.ts)에 버전 문자열이 각각 존재
2. **하드코딩**: `scoring_rule: 'v1.7-revert'` 같은 문자열 리터럴이 파이프라인 코드에 직접 박혀있어 weights 변경 시 자동으로 따라가지 않음
3. **테스트 공백**: "저장된 scoring_rule이 현재 가중치 버전과 일치하는가"를 검증하는 테스트 부재

---

## 해결 (Solution)

### 적용된 수정 (cycle 334, 340)
- `daily.ts`: `scoring_rule: 'v1.8'` (가중치 변경에 맞춰 수동 업데이트)
- `postview-daily.ts`: `scoring_rule: preGame.scoring_rule ?? 'v1.8'` (pre_game 행 상속)
- `predictor.ts`: `model_version: 'v1.8'` fallback 업데이트

### 권장 구조 개선 (미구현, 다음 opportunity)
```typescript
// packages/shared/src/constants/weights.ts
export const CURRENT_SCORING_RULE = 'v1.8' as const;
export const DEFAULT_WEIGHTS = { ... };

// packages/kbo-data/src/pipeline/daily.ts
import { CURRENT_SCORING_RULE } from '@moneyball/shared';
// ...
scoring_rule: CURRENT_SCORING_RULE,  // 단일 소스 참조
```

**테스트 추가 (권장)**:
```typescript
// 가중치 변경 시 scoring_rule도 반드시 업데이트되었는지 assert
test('scoring_rule matches CURRENT_SCORING_RULE', () => {
  const payload = buildPredictionPayload(mockInput);
  expect(payload.scoring_rule).toBe(CURRENT_SCORING_RULE);
});
```

---

## 교훈 (Lesson)

1. **가중치 변경 PR 체크리스트 추가**: weights.ts 변경 → `CURRENT_SCORING_RULE` 상수 동기화 확인 필수
2. **버전 라벨 = 단일 소스**: 파이프라인이 직접 하드코딩하는 것이 아니라 constants를 import해서 사용
3. **model_version vs scoring_rule 역할 분리**: 에이전트 파이프라인 버전(model_version)과 가중치 버전(scoring_rule)은 별개 — 둘을 혼용하면 성과 추적 불가

**재발 방지 트리거**: `git grep "v[0-9]\.[0-9]-" packages/kbo-data/src/pipeline/` — 파이프라인 코드에 하드코딩된 버전 문자열 탐지

import { DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';

const weightSum = Object.values(DEFAULT_WEIGHTS).reduce<number>(
  (a, b) => a + b,
  0,
);

// 팩터 가중합 분모 = DEFAULT_WEIGHTS 합 (현 v1.8 = 0.85).
// 최종 확률 = weightedSum / FACTOR_TOTAL + HOME_ADVANTAGE, clamp [0.15, 0.85].
export const FACTOR_TOTAL = weightSum;

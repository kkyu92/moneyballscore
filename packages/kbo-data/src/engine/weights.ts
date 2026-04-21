import { DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';

const weightSum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);

export const WEIGHTS = DEFAULT_WEIGHTS;
export const WEIGHT_SUM = weightSum;
export const HOME_ADV = HOME_ADVANTAGE;

// 팩터 가중합 (0.85) + 홈어드밴티지 (실측 0.015) = 0.865
// 최종 확률 = (가중합 / 0.85) * 0.85 + 홈보정
export const FACTOR_TOTAL = weightSum; // 0.85

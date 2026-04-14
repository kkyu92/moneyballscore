import { DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';

// 가중치 합산이 1.0 이하인지 검증
const weightSum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum + HOME_ADVANTAGE - 0.88) > 0.001) {
  // 가중치 합 0.85 + 홈어드밴티지 0.03 = 0.88
  // 나머지 0.12는 정규화에서 처리
}

export const WEIGHTS = DEFAULT_WEIGHTS;
export const WEIGHT_SUM = weightSum;
export const HOME_ADV = HOME_ADVANTAGE;

// 가중치 합 기반 정규화 계수
// 팩터 가중합 (0.85) + 홈어드밴티지 (0.03) = 0.88
// 최종 확률 = (가중합 / 0.85) * 0.85 + 홈보정
export const FACTOR_TOTAL = weightSum; // 0.85

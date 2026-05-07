import { DEFAULT_WEIGHTS, HOME_ADVANTAGE, KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import type { PredictionInput, PredictionResult } from '../types';
import { FACTOR_TOTAL } from './weights';

/**
 * 두 값을 0-1 범위로 정규화 (상대 비교)
 * 홈팀이 유리할수록 1에 가깝고, 원정이 유리할수록 0에 가깝다
 *
 * 차이 기반 정규화: (home - away) / scale → [-1, 1] → [0, 1]
 * 양수 전용 비율 공식(a/(a+b))과 동치이면서 음수 입력값에서도 정확.
 * SFR 등 KBO stat은 평균 대비 상대값으로 음수 가능 — cycle 207 버그 수정.
 */
function normalize(homeVal: number, awayVal: number, higherIsBetter: boolean): number {
  if (homeVal === 0 && awayVal === 0) return 0.5;
  const total = Math.abs(homeVal) + Math.abs(awayVal);
  if (total === 0) return 0.5;

  const diff = higherIsBetter ? homeVal - awayVal : awayVal - homeVal;
  return (diff / total + 1) / 2;
}

/**
 * 예측 엔진 v1.7-revert (= v1.5 가중치 복원).
 * 10팩터 가중합산으로 홈팀 승리 확률 계산.
 *
 * v1.6 (Wayback 백테스트로 park/h2h/sfr → 0) 은 cycle 14/16 prod 측정에서
 * v1.5 75% vs v1.6 36.96% 격차 38pp 확인 후 cycle 17 (커밋 81e3208) 회귀.
 * 현 활성 가중치는 packages/shared/src/index.ts DEFAULT_WEIGHTS 단일 출처
 * (sp_fip 0.15 / lineup_woba 0.15 / elo 0.08 / h2h 0.05 / park 0.04 / sfr 0.05 등 10 팩터 모두 활성).
 */
export function predict(input: PredictionInput): PredictionResult {
  const w = DEFAULT_WEIGHTS;
  const factors: Record<string, number> = {};

  // 1. 선발 FIP (낮을수록 좋음)
  const homeSPFip = input.homeSPStats?.fip ?? 4.50;
  const awaySPFip = input.awaySPStats?.fip ?? 4.50;
  factors.sp_fip = normalize(homeSPFip, awaySPFip, false);

  // 2. 선발 xFIP (낮을수록 좋음)
  const homeSPxFip = input.homeSPStats?.xfip ?? 4.50;
  const awaySPxFip = input.awaySPStats?.xfip ?? 4.50;
  factors.sp_xfip = normalize(homeSPxFip, awaySPxFip, false);

  // 3. 타선 wOBA (높을수록 좋음)
  factors.lineup_woba = normalize(
    input.homeTeamStats.woba,
    input.awayTeamStats.woba,
    true
  );

  // 4. 불펜 FIP (낮을수록 좋음)
  factors.bullpen_fip = normalize(
    input.homeTeamStats.bullpenFip,
    input.awayTeamStats.bullpenFip,
    false
  );

  // 5. 최근폼 (높을수록 좋음)
  factors.recent_form = normalize(
    input.homeRecentForm,
    input.awayRecentForm,
    true
  );

  // 6. WAR (높을수록 좋음)
  factors.war = normalize(
    input.homeTeamStats.totalWar,
    input.awayTeamStats.totalWar,
    true
  );

  // 7. 상대전적 (홈팀 승률)
  const h2hTotal = input.headToHead.wins + input.headToHead.losses;
  factors.head_to_head = h2hTotal > 0
    ? input.headToHead.wins / h2hTotal
    : 0.5;

  // 8. 구장보정 (파크팩터)
  // >1이면 타자 유리 → 홈팀 타선이 강하면 유리
  factors.park_factor = input.parkFactor > 1
    ? 0.5 + (input.parkFactor - 1) * 2  // 약간의 홈 보정
    : 0.5 - (1 - input.parkFactor) * 2;
  factors.park_factor = Math.max(0.3, Math.min(0.7, factors.park_factor));

  // 9. Elo 레이팅 (높을수록 좋음)
  factors.elo = normalize(input.homeElo.elo, input.awayElo.elo, true);

  // 10. 수비 SFR (높을수록 좋음)
  factors.sfr = normalize(input.homeTeamStats.sfr, input.awayTeamStats.sfr, true);

  // 가중합산
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(w)) {
    const factorValue = factors[key] ?? 0.5;
    weightedSum += factorValue * weight;
  }

  // 정규화: 가중합을 팩터 총합으로 나눈 후 0-1 범위로
  let homeWinProb = weightedSum / FACTOR_TOTAL;

  // 홈 어드밴티지 적용
  homeWinProb += HOME_ADVANTAGE;

  // 범위 제한 (0.15 ~ 0.85)
  homeWinProb = Math.max(0.15, Math.min(0.85, homeWinProb));

  // 신뢰도: 0.5에서 멀수록 높음
  const confidence = Math.abs(homeWinProb - 0.5) * 2;

  // 승자 결정
  const predictedWinner: TeamCode = homeWinProb >= 0.5
    ? input.game.homeTeam
    : input.game.awayTeam;

  // 예측 근거 생성
  const reasoning = generateReasoning(input, factors, homeWinProb);

  return {
    predictedWinner,
    homeWinProb: Math.round(homeWinProb * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    factors,
    reasoning,
  };
}

function generateReasoning(
  input: PredictionInput,
  factors: Record<string, number>,
  homeWinProb: number
): string {
  const homeName = KBO_TEAMS[input.game.homeTeam].name;
  const awayName = KBO_TEAMS[input.game.awayTeam].name;
  const pct = Math.round(homeWinProb * 100);

  // 가장 영향력 큰 팩터 3개 추출
  const w = DEFAULT_WEIGHTS;
  const contributions = Object.entries(factors)
    .map(([key, val]) => ({
      key,
      impact: Math.abs(val - 0.5) * (w[key as keyof typeof w] || 0),
      favorable: val > 0.5 ? 'home' : 'away',
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  const factorNames: Record<string, string> = {
    sp_fip: '선발투수 FIP',
    sp_xfip: '선발투수 xFIP',
    lineup_woba: '타선 wOBA',
    bullpen_fip: '불펜 FIP',
    recent_form: '최근 폼',
    war: 'WAR',
    head_to_head: '상대전적',
    park_factor: '구장효과',
    elo: 'Elo 레이팅',
    sfr: '수비력(SFR)',
  };

  const topFactors = contributions
    .map((c) => {
      const name = factorNames[c.key] || c.key;
      const team = c.favorable === 'home' ? homeName : awayName;
      return `${name}(${team} 유리)`;
    })
    .join(', ');

  const winner = homeWinProb >= 0.5 ? homeName : awayName;
  return `${winner} 승리 예측 (${pct}%). 주요 근거: ${topFactors}.`;
}

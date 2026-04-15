/**
 * 빅매치 자동 선정 휴리스틱
 *
 * Phase v4-4 Task 0. 하루 경기 중 사용자 관심이 높을 가능성이 큰 1경기를
 * hero 섹션에 강조하기 위해 선정. CEO 리뷰 Q2 + Eng 리뷰 결정.
 *
 * 가중치 (총합 1.0):
 *   - elo_closeness  0.35: Elo 격차가 작을수록 (접전성)
 *   - rivalry_bonus  0.25: 전통 라이벌 경기 가산점 (0 or 1)
 *   - form_momentum  0.20: 양팀 최근폼 유사도 (둘 다 상승세 or 둘 다 하락세)
 *   - confidence_low 0.20: 정량 모델 confidence 낮을수록 (토론 가치 큼)
 *
 * 3단계 fallback (CEO 리뷰 Q6):
 *   1. games.length === 0 → mode: 'no-games'
 *   2. maxScore < THRESHOLD → mode: 'below-threshold'
 *   3. 정상 → mode: 'normal'
 *
 * 결정론적: 같은 입력 → 같은 출력. 테스트 가능.
 */

import type { TeamCode } from '@moneyball/shared';
import { isRivalry } from '@moneyball/shared';

// ============================================
// 타입
// ============================================

export interface BigMatchCandidate {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeElo: number;
  awayElo: number;
  homeRecentForm: number;  // 0.0 ~ 1.0
  awayRecentForm: number;
  confidence: number;       // 정량 모델 confidence (0 ~ 1)
}

export type BigMatchMode = 'normal' | 'below-threshold' | 'no-games';

export interface BigMatchResult {
  mode: BigMatchMode;
  bigMatchGameId: number | null;
  score: number;
  reasons: string[];
}

// ============================================
// 상수
// ============================================

export const WEIGHTS = {
  eloCloseness: 0.35,
  rivalryBonus: 0.25,
  formMomentum: 0.20,
  confidenceLow: 0.20,
} as const;

export const BIG_MATCH_THRESHOLD = 0.5;

// Elo 격차 정규화: 100pt 이상이면 0점, 0이면 1점
const ELO_MAX_GAP = 100;

// ============================================
// 점수 계산 (결정론적)
// ============================================

/**
 * Elo 접전성 점수 (0 ~ 1)
 *   0pt 격차 → 1.0
 *   100+pt 격차 → 0.0
 *   선형 감소
 */
export function computeEloCloseness(homeElo: number, awayElo: number): number {
  const gap = Math.abs(homeElo - awayElo);
  if (gap >= ELO_MAX_GAP) return 0;
  return 1 - gap / ELO_MAX_GAP;
}

/**
 * 폼 모멘텀 점수 (0 ~ 1)
 *   양팀 모두 상승세(>0.6) or 양팀 모두 하락세(<0.4) → 1.0
 *   한쪽만 상승/하락 → 0.0
 *   둘 다 중간 → 0.5
 */
export function computeFormMomentum(homeForm: number, awayForm: number): number {
  const bothHigh = homeForm > 0.6 && awayForm > 0.6;
  const bothLow = homeForm < 0.4 && awayForm < 0.4;
  if (bothHigh || bothLow) return 1.0;

  const bothMid = homeForm >= 0.4 && homeForm <= 0.6 && awayForm >= 0.4 && awayForm <= 0.6;
  if (bothMid) return 0.5;

  return 0;
}

/**
 * 정량 모델 confidence 역수 (0 ~ 1)
 *   confidence 0.0 → 1.0 (모델이 자신 없음 = 토론 가치 큼)
 *   confidence 1.0 → 0.0
 */
export function computeConfidenceLow(confidence: number): number {
  return Math.max(0, Math.min(1, 1 - confidence));
}

/**
 * 경기 1개 점수 계산 (0 ~ 1)
 */
export function scoreGame(game: BigMatchCandidate): { score: number; breakdown: Record<string, number> } {
  const eloScore = computeEloCloseness(game.homeElo, game.awayElo);
  const rivalryScore = isRivalry(game.homeTeam, game.awayTeam) ? 1 : 0;
  const formScore = computeFormMomentum(game.homeRecentForm, game.awayRecentForm);
  const confScore = computeConfidenceLow(game.confidence);

  const score =
    eloScore * WEIGHTS.eloCloseness +
    rivalryScore * WEIGHTS.rivalryBonus +
    formScore * WEIGHTS.formMomentum +
    confScore * WEIGHTS.confidenceLow;

  return {
    score: Number(score.toFixed(4)),
    breakdown: {
      elo: Number(eloScore.toFixed(3)),
      rivalry: rivalryScore,
      form: Number(formScore.toFixed(3)),
      confLow: Number(confScore.toFixed(3)),
    },
  };
}

// ============================================
// 메인 선정 함수
// ============================================

export function selectBigMatch(candidates: BigMatchCandidate[]): BigMatchResult {
  // 1단계: 경기 0개
  if (candidates.length === 0) {
    console.log('[big-match] mode=no-games (경기 없음)');
    return {
      mode: 'no-games',
      bigMatchGameId: null,
      score: 0,
      reasons: ['no-games'],
    };
  }

  // 각 경기 점수 계산
  const scored = candidates.map((c) => ({
    candidate: c,
    ...scoreGame(c),
  }));

  // 최고 점수 경기 선정 (tiebreaker: gameId 낮은 쪽 = 결정론 보장)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.candidate.gameId - b.candidate.gameId;
  });

  const top = scored[0];
  const reasons = Object.entries(top.breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}:${v}`);

  // 2단계: 임계값 미달
  if (top.score < BIG_MATCH_THRESHOLD) {
    console.log(
      `[big-match] mode=below-threshold maxScore=${top.score.toFixed(3)} ` +
      `(threshold=${BIG_MATCH_THRESHOLD}, hero 숨김)`
    );
    return {
      mode: 'below-threshold',
      bigMatchGameId: null,
      score: top.score,
      reasons,
    };
  }

  // 3단계: 정상
  console.log(
    `[big-match] mode=normal winner=${top.candidate.homeTeam}-${top.candidate.awayTeam} ` +
    `score=${top.score.toFixed(3)} reasons=[${reasons.join(',')}]`
  );
  return {
    mode: 'normal',
    bigMatchGameId: top.candidate.gameId,
    score: top.score,
    reasons,
  };
}

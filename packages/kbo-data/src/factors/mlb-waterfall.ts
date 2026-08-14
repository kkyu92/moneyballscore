import { ELO_DIVIDER, HOME_ELO_BONUS, clampWinnerProb } from '@moneyball/shared';
import { MLB_BASE_WEIGHTS } from './mlb-base';

// MlbFactorWaterfallChart 용 pure 계산 — computeMlbProbability(mlb-base.ts) 의
// homeAdvantage 항들과 정확히 동일한 계수를 재현해 bar 합 = pred.home_win_prob 보장.
//
// recent_form / head_to_head / elo(팀별) / defense_sfr / sp_xwoba_against / woba_std 는
// mlb-pipeline.ts runPredictFinal 이 항상 중립값(home===away)으로 계산 입력만 하고 저장은
// 안 하는 미구현 placeholder (plan #25 Phase 3 게이트, cycle 2097/2103 확인) — 기여도가
// 항상 0이라 waterfall bar 대상에서 제외. elo 항의 HOME_ELO_BONUS 가산분 + 별도
// home_elo_bonus 가중치는 팀 무관 고정 상수라 "홈 어드밴티지" 단일 bar 로 합산.

export interface MlbWaterfallPair {
  home: number | null;
  away: number | null;
}

export interface MlbWaterfallInput {
  sp_fip: MlbWaterfallPair;
  sp_xfip: MlbWaterfallPair;
  bullpen_fip: MlbWaterfallPair;
  lineup_woba: MlbWaterfallPair;
  war: MlbWaterfallPair;
  lineup_xwoba: MlbWaterfallPair;
  lineup_barrel_pct: MlbWaterfallPair;
  homeParkPf: number;
  homeWinProb: number;
}

export interface MlbWaterfallBar {
  factor: string;
  label: string;
  contribution: number; // pp fraction, e.g. 0.012 = +1.2pp home
  cumulative: number;
  base: number;
  end: number;
  direction: 'home' | 'away' | 'neutral';
}

const HOME_ADVANTAGE_CONSTANT =
  MLB_BASE_WEIGHTS.elo * (HOME_ELO_BONUS / ELO_DIVIDER) + MLB_BASE_WEIGHTS.home_elo_bonus * 0.5;

function bar(
  factor: string,
  label: string,
  contribution: number,
  cumulative: number,
): MlbWaterfallBar {
  const end = cumulative + contribution;
  return {
    factor,
    label,
    contribution,
    cumulative: end,
    base: cumulative,
    end,
    direction: contribution > 0 ? 'home' : contribution < 0 ? 'away' : 'neutral',
  };
}

export function computeMlbWaterfall(input: MlbWaterfallInput): MlbWaterfallBar[] {
  const bars: MlbWaterfallBar[] = [];
  let cumulative = 0.5;

  bars.push(bar('home_advantage', '홈 어드밴티지', HOME_ADVANTAGE_CONSTANT, cumulative));
  cumulative = bars[bars.length - 1].end;

  const pairTerms: Array<{
    key: keyof typeof MLB_BASE_WEIGHTS;
    label: string;
    pair: MlbWaterfallPair;
    multiplier: number;
    invert: boolean;
  }> = [
    { key: 'sp_fip', label: '선발 FIP', pair: input.sp_fip, multiplier: 1, invert: true },
    { key: 'sp_xfip', label: '선발 xFIP', pair: input.sp_xfip, multiplier: 1, invert: true },
    { key: 'bullpen_fip', label: '불펜 FIP', pair: input.bullpen_fip, multiplier: 1, invert: true },
    { key: 'lineup_woba', label: '타선 wOBA', pair: input.lineup_woba, multiplier: 5, invert: false },
    { key: 'war', label: 'WAR', pair: input.war, multiplier: 0.01, invert: false },
    { key: 'lineup_xwoba', label: '타선 xwOBA', pair: input.lineup_xwoba, multiplier: 5, invert: false },
    { key: 'lineup_barrel_pct', label: 'Barrel%', pair: input.lineup_barrel_pct, multiplier: 0.01, invert: false },
  ];

  for (const term of pairTerms) {
    const { home, away } = term.pair;
    if (home == null || away == null) continue; // 데이터 부재 팀 — fabricate X, bar skip
    const sign = term.invert ? -1 : 1;
    const contribution = sign * MLB_BASE_WEIGHTS[term.key] * (home - away) * term.multiplier;
    bars.push(bar(term.key, term.label, contribution, cumulative));
    cumulative = bars[bars.length - 1].end;
  }

  const parkContribution = MLB_BASE_WEIGHTS.park_factor * (input.homeParkPf / 100 - 1.0);
  bars.push(bar('park_factor', '구장 보정', parkContribution, cumulative));
  cumulative = bars[bars.length - 1].end;

  const finalProb = clampWinnerProb(input.homeWinProb);
  bars.push({
    factor: 'final',
    label: '최종 확률',
    contribution: finalProb - 0.5,
    cumulative: finalProb,
    base: 0.5,
    end: finalProb,
    direction: finalProb >= 0.5 ? 'home' : 'away',
  });

  return bars;
}

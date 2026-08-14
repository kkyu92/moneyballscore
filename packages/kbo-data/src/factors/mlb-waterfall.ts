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
  locale?: 'ko' | 'en';
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

// bar.label 은 MlbFactorWaterfallChart(EN 페이지 포함)와 buildMlbGameOverview 양쪽이
// 그대로 렌더 — locale 파라미터로 EN 페이지에 한글 라벨이 섞이는 gap 정정 (cycle 2111,
// cycle 2110 TODOS 후속: computeMlbWaterfall label 미localize 상태로 남겼던 항목).
const LABELS: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    home_advantage: '홈 어드밴티지',
    sp_fip: '선발 FIP',
    sp_xfip: '선발 xFIP',
    bullpen_fip: '불펜 FIP',
    lineup_woba: '타선 wOBA',
    war: 'WAR',
    lineup_xwoba: '타선 xwOBA',
    lineup_barrel_pct: 'Barrel%',
    park_factor: '구장 보정',
    final: '최종 확률',
  },
  en: {
    home_advantage: 'Home Advantage',
    sp_fip: 'SP FIP',
    sp_xfip: 'SP xFIP',
    bullpen_fip: 'Bullpen FIP',
    lineup_woba: 'Lineup wOBA',
    war: 'WAR',
    lineup_xwoba: 'Lineup xwOBA',
    lineup_barrel_pct: 'Barrel%',
    park_factor: 'Park Factor',
    final: 'Final Probability',
  },
};

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
  const labels = LABELS[input.locale ?? 'ko'];
  const bars: MlbWaterfallBar[] = [];
  let cumulative = 0.5;

  bars.push(bar('home_advantage', labels.home_advantage, HOME_ADVANTAGE_CONSTANT, cumulative));
  cumulative = bars[bars.length - 1].end;

  const pairTerms: Array<{
    key: keyof typeof MLB_BASE_WEIGHTS;
    pair: MlbWaterfallPair;
    multiplier: number;
    invert: boolean;
  }> = [
    { key: 'sp_fip', pair: input.sp_fip, multiplier: 1, invert: true },
    { key: 'sp_xfip', pair: input.sp_xfip, multiplier: 1, invert: true },
    { key: 'bullpen_fip', pair: input.bullpen_fip, multiplier: 1, invert: true },
    { key: 'lineup_woba', pair: input.lineup_woba, multiplier: 5, invert: false },
    { key: 'war', pair: input.war, multiplier: 0.01, invert: false },
    { key: 'lineup_xwoba', pair: input.lineup_xwoba, multiplier: 5, invert: false },
    { key: 'lineup_barrel_pct', pair: input.lineup_barrel_pct, multiplier: 0.01, invert: false },
  ];

  for (const term of pairTerms) {
    const { home, away } = term.pair;
    if (home == null || away == null) continue; // 데이터 부재 팀 — fabricate X, bar skip
    const sign = term.invert ? -1 : 1;
    const contribution = sign * MLB_BASE_WEIGHTS[term.key] * (home - away) * term.multiplier;
    bars.push(bar(term.key, labels[term.key], contribution, cumulative));
    cumulative = bars[bars.length - 1].end;
  }

  const parkContribution = MLB_BASE_WEIGHTS.park_factor * (input.homeParkPf / 100 - 1.0);
  bars.push(bar('park_factor', labels.park_factor, parkContribution, cumulative));
  cumulative = bars[bars.length - 1].end;

  const finalProb = clampWinnerProb(input.homeWinProb);
  bars.push({
    factor: 'final',
    label: labels.final,
    contribution: finalProb - 0.5,
    cumulative: finalProb,
    base: 0.5,
    end: finalProb,
    direction: finalProb >= 0.5 ? 'home' : 'away',
  });

  return bars;
}

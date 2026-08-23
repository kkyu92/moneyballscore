import { ELO_DIVIDER, HOME_ELO_BONUS, clampWinnerProb } from '@moneyball/shared';
import { MLB_BASE_WEIGHTS } from './mlb-base';

// MlbFactorWaterfallChart 용 pure 계산 — computeMlbProbability(mlb-base.ts) 의
// homeAdvantage 항들과 정확히 동일한 계수를 재현해 bar 합 = pred.home_win_prob 보장.
//
// defense_sfr / sp_xwoba_against / woba_std 는 mlb-pipeline.ts runPredictFinal 이 항상
// 중립값(home===away)으로 계산 입력만 하고 저장은 안 하는 미구현 placeholder (plan #25
// Phase 3 게이트, cycle 2097/2103 확인) — 기여도가 항상 0이라 waterfall bar 대상에서 제외.
// elo(팀별)는 cycle 2349 부터 mlb_team_elo 실측 반영 — team-invariant 인 HOME_ELO_BONUS
// 가산분 + home_elo_bonus 가중치만 "홈 어드밴티지" 단일 bar 로 합산하고, team-variant 인
// (home-away) 델타는 별도 elo bar 로 분리. recent_form/head_to_head 는 cycle 2353 부터
// mlb_schedule 실측(최근 10경기 승률/시즌 h2h) 반영 — head_to_head 는 mlb-base.ts 계산
// 계약상 단일 homeWinRate 라 {home: winRate, away: 1-winRate} 로 대칭 pair 인코딩(멀티플라
// 이어 0.5)해 기존 pairTerms 루프에 그대로 태움 (weight*(home-away)*0.5 = weight*(winRate-0.5)).

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
  recent_form: MlbWaterfallPair;
  head_to_head: MlbWaterfallPair;
  lineup_xwoba: MlbWaterfallPair;
  lineup_barrel_pct: MlbWaterfallPair;
  elo: MlbWaterfallPair;
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
    recent_form: '최근폼',
    head_to_head: '상대전적',
    lineup_xwoba: '타선 xwOBA',
    lineup_barrel_pct: 'Barrel%',
    elo: 'Elo',
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
    recent_form: 'Recent Form',
    head_to_head: 'Head-to-Head',
    lineup_xwoba: 'Lineup xwOBA',
    lineup_barrel_pct: 'Barrel%',
    elo: 'Elo',
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
    { key: 'recent_form', pair: input.recent_form, multiplier: 0.05, invert: false },
    // head_to_head 는 homeWinRate 단일값을 {home: rate, away: 1-rate} 대칭 pair 로 인코딩해
    // 넘겨받음 — multiplier 0.5 는 (home-away)=2*(rate-0.5) 를 mlb-base.ts 계약인
    // weight*(rate-0.5) 로 되돌리는 상쇄항.
    { key: 'head_to_head', pair: input.head_to_head, multiplier: 0.5, invert: false },
    { key: 'lineup_xwoba', pair: input.lineup_xwoba, multiplier: 5, invert: false },
    { key: 'lineup_barrel_pct', pair: input.lineup_barrel_pct, multiplier: 0.01, invert: false },
    { key: 'elo', pair: input.elo, multiplier: 1 / ELO_DIVIDER, invert: false },
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

import { MLB_BASE_WEIGHTS } from './mlb-base';
import { NARRATIVE_MIN_PP, toSentence } from './mlb-overview';
import type { MlbWaterfallBar, MlbWaterfallInput, MlbWaterfallPair } from './mlb-waterfall';

// MLB game-detail "N factor breakdown" 섹션용 — KBO DetailedFactorAnalysis parity
// (cycle 2171). computeMlbWaterfall 이 이미 산출한 bar(contribution/direction)를
// 그대로 소비, 신규 계산/DB 조회 없음. home_advantage/park_factor/final 은
// GAME_DETAIL_FACTOR_ROWS(cycle 2108)와 동일하게 상세 테이블 대상에서 제외
// (park_factor는 팀별 home/away pair가 아닌 단일 구장 상수라 이 뷰의 "두 팀 비교"
// 포맷과 안 맞음 — waterfall/개요 prose에서는 이미 노출).
const EXCLUDED_DETAIL_FACTORS = new Set(['home_advantage', 'park_factor', 'final']);

const FIP_LIKE = new Set(['sp_fip', 'sp_xfip', 'bullpen_fip']);
const WOBA_LIKE = new Set(['lineup_woba', 'lineup_xwoba']);

function formatMlbFactorValue(key: string, value: number | null | undefined): string {
  if (value == null) return '—';
  if (FIP_LIKE.has(key)) return value.toFixed(2);
  if (WOBA_LIKE.has(key)) return value.toFixed(3);
  if (key === 'war') return value.toFixed(1);
  if (key === 'lineup_barrel_pct') return `${value.toFixed(1)}%`;
  if (key === 'elo') return value.toFixed(0);
  if (key === 'recent_form') return `${value.toFixed(1)}%`;
  if (key === 'head_to_head') return `${(value * 100).toFixed(0)}%`;
  return value.toFixed(2);
}

export interface MlbFactorDetailRow {
  key: string;
  label: string;
  weightPct: number;
  homeValueLabel: string;
  awayValueLabel: string;
  favor: 'home' | 'away' | 'neutral';
  contributionPct: number;
  narrative: string;
}

export function buildMlbFactorDetailRows(
  bars: MlbWaterfallBar[],
  values: MlbWaterfallInput,
  homeTeamName: string,
  awayTeamName: string,
  locale: 'ko' | 'en' = 'ko',
): MlbFactorDetailRow[] {
  const pairsByFactor = values as unknown as Record<string, MlbWaterfallPair>;

  return bars
    .filter((bar) => !EXCLUDED_DETAIL_FACTORS.has(bar.factor))
    .map((bar) => {
      const pair = pairsByFactor[bar.factor];
      const contributionPct = Math.round(bar.contribution * 1000) / 10;
      const weight = MLB_BASE_WEIGHTS[bar.factor as keyof typeof MLB_BASE_WEIGHTS] ?? 0;
      const favor: MlbFactorDetailRow['favor'] =
        Math.abs(contributionPct) < NARRATIVE_MIN_PP ? 'neutral' : bar.direction;
      const narrative =
        toSentence(bar, homeTeamName, awayTeamName, locale) ??
        (locale === 'en' ? `Negligible gap in ${bar.label}.` : `${bar.label} 차이 근소.`);

      return {
        key: bar.factor,
        label: bar.label,
        weightPct: Math.round(weight * 100),
        homeValueLabel: formatMlbFactorValue(bar.factor, pair?.home),
        awayValueLabel: formatMlbFactorValue(bar.factor, pair?.away),
        favor,
        contributionPct,
        narrative,
      };
    });
}

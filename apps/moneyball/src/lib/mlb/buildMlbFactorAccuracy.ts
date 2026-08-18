import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES } from '@moneyball/shared';
import { FACTOR_LABELS } from '@/lib/predictions/factorLabels';
import type { FactorAccuracyRow } from '@/lib/accuracy/buildFactorAccuracy';
import { deriveMlbOutcome } from './deriveMlbOutcome';

// MLB predictions 는 KBO 의 정규화된 `factors` JSONB(0.5 중심) 대신 원본 스탯 값을
// home_*/away_* 플랫 컬럼으로 저장(mlb-pipeline.ts runPredictFinal 참조,
// elo/recent_form/head_to_head/defense_sfr 4팩터는 실데이터 미구현이라 컬럼 자체가
// 항상 NULL — plan #24/#25 기존 결론, 본 파일에선 의도적으로 제외). 그래서 KBO
// buildFactorAccuracy 의 "0.45~0.55 중립대 skip" 로직 대신 home/away 값 직접 비교로
// "팩터가 홈을 우세로 봤는가" 를 판정.
const FACTOR_COLUMN_PAIRS = {
  sp_fip: ['home_sp_fip', 'away_sp_fip'],
  sp_xfip: ['home_sp_xfip', 'away_sp_xfip'],
  lineup_woba: ['home_lineup_woba', 'away_lineup_woba'],
  bullpen_fip: ['home_bullpen_fip', 'away_bullpen_fip'],
  war: ['home_war_total', 'away_war_total'],
  lineup_xwoba: ['home_lineup_xwoba', 'away_lineup_xwoba'],
  lineup_barrel_pct: ['home_lineup_barrel_pct', 'away_lineup_barrel_pct'],
} as const;

type FactorKey = keyof typeof FACTOR_COLUMN_PAIRS;

// FIP/xFIP 는 ERA 등가라 낮을수록 우수 — 나머지(woba/war/xwoba/barrel%)는 높을수록 우수.
// computeMlbFactorContributions(mlb-base.ts) 의 부호 규칙과 동일.
const LOWER_IS_BETTER = new Set<FactorKey>(['sp_fip', 'sp_xfip', 'bullpen_fip']);

const MLB_FACTOR_LABELS_EN: Record<FactorKey, string> = {
  sp_fip: 'Starter FIP',
  sp_xfip: 'Starter xFIP',
  lineup_woba: 'Lineup wOBA',
  bullpen_fip: 'Bullpen FIP',
  war: 'WAR',
  lineup_xwoba: 'Lineup xwOBA',
  lineup_barrel_pct: 'Barrel %',
};

const MLB_FACTOR_LABELS_KO: Record<FactorKey, string> = {
  sp_fip: FACTOR_LABELS.sp_fip,
  sp_xfip: FACTOR_LABELS.sp_xfip,
  lineup_woba: FACTOR_LABELS.lineup_woba,
  bullpen_fip: FACTOR_LABELS.bullpen_fip,
  war: FACTOR_LABELS.war,
  lineup_xwoba: '타선 xwOBA',
  lineup_barrel_pct: 'Barrel %',
};

interface MlbFactorBreakdownRow {
  external_game_id: string | null;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  home_lineup_xwoba: number | null;
  away_lineup_xwoba: number | null;
  home_lineup_barrel_pct: number | null;
  away_lineup_barrel_pct: number | null;
}

interface ScheduleFinalRow {
  external_game_id: string;
  home_score: number | null;
  away_score: number | null;
}

export async function buildMlbFactorAccuracy(locale: 'ko' | 'en' = 'ko'): Promise<FactorAccuracyRow[]> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score')
    .eq('status', 'final');
  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbFactorAccuracy mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select(
      'external_game_id, home_win_prob, home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip, home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip, home_war_total, away_war_total, home_lineup_xwoba, away_lineup_xwoba, home_lineup_barrel_pct, away_lineup_barrel_pct',
    )
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));
  const { data: predData } = assertSelectOk(predResult, 'buildMlbFactorAccuracy predictions');

  const predByExternalId = new Map<string, MlbFactorBreakdownRow>();
  for (const p of (predData ?? []) as MlbFactorBreakdownRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const stats: Record<FactorKey, { total: number; correct: number; homeN: number; awayN: number }> =
    Object.fromEntries(
      (Object.keys(FACTOR_COLUMN_PAIRS) as FactorKey[]).map((k) => [k, { total: 0, correct: 0, homeN: 0, awayN: 0 }]),
    ) as Record<FactorKey, { total: number; correct: number; homeN: number; awayN: number }>;

  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const { actualHomeWin } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore: s.home_score != null && s.away_score != null,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    if (actualHomeWin == null) continue;

    for (const key of Object.keys(FACTOR_COLUMN_PAIRS) as FactorKey[]) {
      const [homeCol, awayCol] = FACTOR_COLUMN_PAIRS[key];
      const homeVal = pred[homeCol as keyof MlbFactorBreakdownRow];
      const awayVal = pred[awayCol as keyof MlbFactorBreakdownRow];
      if (homeVal == null || awayVal == null || homeVal === awayVal) continue;

      const homeFavored = LOWER_IS_BETTER.has(key) ? homeVal < awayVal : homeVal > awayVal;
      const stat = stats[key];
      stat.total++;
      if (homeFavored === actualHomeWin) stat.correct++;
      if (homeFavored) stat.homeN++;
      else stat.awayN++;
    }
  }

  const labels = locale === 'en' ? MLB_FACTOR_LABELS_EN : MLB_FACTOR_LABELS_KO;

  return (Object.keys(FACTOR_COLUMN_PAIRS) as FactorKey[])
    .map((key) => ({
      key,
      label: labels[key],
      n: stats[key].total,
      accuracy: stats[key].total > 0 ? stats[key].correct / stats[key].total : 0,
      homeN: stats[key].homeN,
      awayN: stats[key].awayN,
    }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.accuracy - a.accuracy);
}

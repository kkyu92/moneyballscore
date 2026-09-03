import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES } from '@moneyball/shared';
import { FACTOR_LABELS } from '@/lib/predictions/factorLabels';
import type { FactorAccuracyRow } from '@/lib/accuracy/buildFactorAccuracy';
import { deriveMlbOutcome } from './deriveMlbOutcome';

// MLB predictions 는 KBO 의 정규화된 `factors` JSONB(0.5 중심) 대신 원본 스탯 값을
// home_*/away_* 플랫 컬럼으로 저장(mlb-pipeline.ts runPredictFinal 참조). elo/recent_form
// 은 cycle 2349/2353 부터, defense_sfr 만 여전히 미구현 placeholder(항상 0/0 — mlb-pipeline.ts
// line 398 참조)라 본 파일에서 의도적으로 제외 (2026-09-03 cycle 2824 정정 —
// 과거 "4팩터 전부 미구현" 서술은 cycle 2349/2353 wiring 이전 stale 서술).
// KBO buildFactorAccuracy 의 "0.45~0.55 중립대 skip" 로직 대신 home/away 값 직접 비교로
// "팩터가 홈을 우세로 봤는가" 를 판정.
const FACTOR_COLUMN_PAIRS = {
  sp_fip: ['home_sp_fip', 'away_sp_fip'],
  sp_xfip: ['home_sp_xfip', 'away_sp_xfip'],
  lineup_woba: ['home_lineup_woba', 'away_lineup_woba'],
  bullpen_fip: ['home_bullpen_fip', 'away_bullpen_fip'],
  war: ['home_war_total', 'away_war_total'],
  lineup_xwoba: ['home_lineup_xwoba', 'away_lineup_xwoba'],
  lineup_barrel_pct: ['home_lineup_barrel_pct', 'away_lineup_barrel_pct'],
  elo: ['home_elo', 'away_elo'],
  recent_form: ['home_recent_form', 'away_recent_form'],
} as const;

type PairFactorKey = keyof typeof FACTOR_COLUMN_PAIRS;

// head_to_head_rate 는 home/away 쌍이 아니라 "홈팀 상대전적 승률"(0-1) 단일값 —
// mlb-pipeline.ts line 373 "head_to_head 는 0-1(승률)" 주석 + KBO NEUTRAL_FACTOR(0.5)
// 판정과 동일 원리로 >0.5 홈 우세 / <0.5 원정 우세 판정.
const SINGLE_RATE_COLUMN = 'head_to_head_rate' as const;
const SINGLE_RATE_NEUTRAL = 0.5;

type FactorKey = PairFactorKey | 'head_to_head';

// FIP/xFIP 는 ERA 등가라 낮을수록 우수 — 나머지(woba/war/xwoba/barrel%)는 높을수록 우수.
// computeMlbFactorContributions(mlb-base.ts) 의 부호 규칙과 동일.
const LOWER_IS_BETTER = new Set<PairFactorKey>(['sp_fip', 'sp_xfip', 'bullpen_fip']);

const MLB_FACTOR_LABELS_EN: Record<FactorKey, string> = {
  sp_fip: 'Starter FIP',
  sp_xfip: 'Starter xFIP',
  lineup_woba: 'Lineup wOBA',
  bullpen_fip: 'Bullpen FIP',
  war: 'WAR',
  lineup_xwoba: 'Lineup xwOBA',
  lineup_barrel_pct: 'Barrel %',
  elo: 'Elo Rating',
  recent_form: 'Recent Form',
  head_to_head: 'Head-to-Head',
};

const MLB_FACTOR_LABELS_KO: Record<FactorKey, string> = {
  sp_fip: FACTOR_LABELS.sp_fip,
  sp_xfip: FACTOR_LABELS.sp_xfip,
  lineup_woba: FACTOR_LABELS.lineup_woba,
  bullpen_fip: FACTOR_LABELS.bullpen_fip,
  war: FACTOR_LABELS.war,
  lineup_xwoba: '타선 xwOBA',
  lineup_barrel_pct: 'Barrel %',
  elo: FACTOR_LABELS.elo,
  recent_form: FACTOR_LABELS.recent_form,
  head_to_head: FACTOR_LABELS.head_to_head,
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
  home_elo: number | null;
  away_elo: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  head_to_head_rate: number | null;
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
      'external_game_id, home_win_prob, home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip, home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip, home_war_total, away_war_total, home_lineup_xwoba, away_lineup_xwoba, home_lineup_barrel_pct, away_lineup_barrel_pct, home_elo, away_elo, home_recent_form, away_recent_form, head_to_head_rate',
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

  const ALL_FACTOR_KEYS: FactorKey[] = [...(Object.keys(FACTOR_COLUMN_PAIRS) as PairFactorKey[]), 'head_to_head'];

  const stats: Record<FactorKey, { total: number; correct: number; homeN: number; awayN: number }> =
    Object.fromEntries(
      ALL_FACTOR_KEYS.map((k) => [k, { total: 0, correct: 0, homeN: 0, awayN: 0 }]),
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

    for (const key of Object.keys(FACTOR_COLUMN_PAIRS) as PairFactorKey[]) {
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

    const h2h = pred[SINGLE_RATE_COLUMN];
    if (h2h != null && h2h !== SINGLE_RATE_NEUTRAL) {
      const homeFavored = h2h > SINGLE_RATE_NEUTRAL;
      const stat = stats.head_to_head;
      stat.total++;
      if (homeFavored === actualHomeWin) stat.correct++;
      if (homeFavored) stat.homeN++;
      else stat.awayN++;
    }
  }

  const labels = locale === 'en' ? MLB_FACTOR_LABELS_EN : MLB_FACTOR_LABELS_KO;

  return ALL_FACTOR_KEYS
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

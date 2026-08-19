import { type NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { deriveMlbOutcome } from '@/lib/mlb/deriveMlbOutcome';
import {
  CURRENT_SCORING_RULE,
  assertSelectOk,
  PICKS_RESULTS_IDS_LIMIT,
  MLB_PRODUCTION_COHORT_RULES,
  mlbShortTeamName,
} from '@moneyball/shared';

export const dynamic = 'force-dynamic';

// PickButton 이 league='mlb' 일 때 localStorage 키에 붙이는 네임스페이스 접두어
// (components/picks/PickButton.tsx storageKey) 와 동일 컨벤션.
const MLB_ID_PREFIX = 'mlb-';

export interface PickGameResult {
  // KBO: games.id (number). MLB: `mlb-${external_game_id}` (string) — 정수 FK
  // 체계가 아니라 팀 id 매칭이 안 돼 문자열 네임스페이스로 구분.
  id: number | string;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_team: { id: number; name_ko: string | null; code: string | null } | null;
  away_team: { id: number; name_ko: string | null; code: string | null } | null;
  ai_predicted_winner_id: number | null;
  /**
   * MLB 전용 승자 예측(bool). MLB predictions 행은 team FK 가 아니라 string 코드라
   * ai_predicted_winner_id 매칭이 불가 — deriveMlbOutcome 로 직접 bool 산출.
   * undefined/null = KBO row (ai_predicted_winner_id 사용) 또는 미확정.
   */
  ai_predicted_home_win?: boolean | null;
  ai_confidence: number | null;
  ai_is_correct: boolean | null;
  /**
   * factors map — per-factor home-win prob [0,1] (0.5=중립).
   * pre_game + CURRENT_SCORING_RULE row 만 pick. null = pre_game prediction 미생성
   * or factors 비어있음 / scoring_rule mismatch. MLB row 는 항상 null(정규화된
   * factors 없음, home/away 원본 스탯 컬럼 — mlb-shared.ts 주석 참조).
   */
  ai_factors: Record<string, number> | null;
}

interface PredictionRow {
  predicted_winner: number | null;
  confidence: number | null;
  is_correct: boolean | null;
  factors: Record<string, number> | null;
  prediction_type: string | null;
  scoring_rule: string | null;
}

interface MlbScheduleRow {
  external_game_id: string;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

interface MlbPredictionRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

async function fetchMlbPickResults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  externalIds: string[],
): Promise<PickGameResult[]> {
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, status, home_score, away_score, home_team_code, away_team_code')
    .in('external_game_id', externalIds);

  if (scheduleResult.error) {
    Sentry.captureException(scheduleResult.error, {
      tags: { layer: 'api-route', route: 'picks-results', league: 'mlb', stage: 'schedule' },
      extra: { ids_count: externalIds.length, message: scheduleResult.error.message },
    });
    throw new Error(scheduleResult.error.message);
  }
  const scheduleRows = (scheduleResult.data ?? []) as MlbScheduleRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));

  if (predResult.error) {
    Sentry.captureException(predResult.error, {
      tags: { layer: 'api-route', route: 'picks-results', league: 'mlb', stage: 'predictions' },
      extra: { ids_count: externalIds.length, message: predResult.error.message },
    });
    throw new Error(predResult.error.message);
  }
  const predByExternalId = new Map(
    ((predResult.data ?? []) as MlbPredictionRow[])
      .filter((p) => p.external_game_id)
      .map((p) => [p.external_game_id as string, p]),
  );

  return scheduleRows.map((s) => {
    const pred = predByExternalId.get(s.external_game_id);
    const hasFinalScore = s.status === 'final' && s.home_score != null && s.away_score != null;
    const { predictedHomeWin, isCorrect, confidence } = deriveMlbOutcome({
      homeWinProb: pred?.home_win_prob ?? null,
      hasFinalScore,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });

    return {
      id: `${MLB_ID_PREFIX}${s.external_game_id}`,
      game_date: s.game_date,
      home_score: s.home_score,
      away_score: s.away_score,
      status: s.status,
      home_team: { id: 0, name_ko: mlbShortTeamName(s.home_team_code), code: s.home_team_code },
      away_team: { id: 0, name_ko: mlbShortTeamName(s.away_team_code), code: s.away_team_code },
      ai_predicted_winner_id: null,
      ai_predicted_home_win: predictedHomeWin,
      ai_confidence: confidence,
      ai_is_correct: isCorrect,
      ai_factors: null,
    };
  });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids');
  if (!raw) return NextResponse.json([] as PickGameResult[]);

  const rawIds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, PICKS_RESULTS_IDS_LIMIT); // 상한 보호 (KBO+MLB 합산)

  const ids = rawIds
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n) && n > 0);
  const mlbExternalIds = rawIds
    .filter((s) => s.startsWith(MLB_ID_PREFIX))
    .map((s) => s.slice(MLB_ID_PREFIX.length))
    .filter(Boolean);

  if (ids.length === 0 && mlbExternalIds.length === 0) return NextResponse.json([] as PickGameResult[]);

  const supabase = await createClient();

  const results: PickGameResult[] = [];

  if (ids.length > 0) {
    // predictions 안 factors + prediction_type + scoring_rule select.
    // server-side 에서 pre_game + CURRENT_SCORING_RULE row 만 pick (shadow row 차단).
    const result = await supabase
      .from('games')
      .select(
        `id, game_date, home_score, away_score, status,
         home_team:home_team_id ( id, name_ko, code ),
         away_team:away_team_id ( id, name_ko, code ),
         predictions ( predicted_winner, confidence, is_correct, factors, prediction_type, scoring_rule )`,
      )
      .in('id', ids);

    if (result.error) {
      Sentry.captureException(result.error, {
        tags: { layer: 'api-route', route: 'picks-results' },
        extra: { ids_count: ids.length, message: result.error.message },
      });
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    let data;
    try {
      ({ data } = assertSelectOk(result, 'picks.results.getGames'));
    } catch (e) {
      Sentry.captureException(e, {
        tags: { layer: 'api-route', route: 'picks-results' },
        extra: { ids_count: ids.length, stage: 'assertSelectOk' },
      });
      throw e;
    }

    for (const g of data ?? []) {
      const predsRaw = Array.isArray(g.predictions)
        ? g.predictions
        : g.predictions
          ? [g.predictions]
          : [];
      const preds = predsRaw as PredictionRow[];
      // pre_game + CURRENT_SCORING_RULE prefer. legacy null scoring_rule row 도 호환.
      const pred =
        preds.find(
          (p) => p.prediction_type === 'pre_game' && p.scoring_rule === CURRENT_SCORING_RULE,
        ) ??
        preds.find((p) => p.prediction_type === 'pre_game') ??
        preds[0] ??
        null;

      const homeTeam = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team;
      const awayTeam = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team;

      results.push({
        id: g.id,
        game_date: g.game_date,
        home_score: g.home_score,
        away_score: g.away_score,
        status: g.status,
        home_team: homeTeam,
        away_team: awayTeam,
        ai_predicted_winner_id: pred?.predicted_winner ?? null,
        ai_confidence: pred?.confidence ?? null,
        ai_is_correct: pred?.is_correct ?? null,
        ai_factors: pred?.factors ?? null,
      });
    }
  }

  if (mlbExternalIds.length > 0) {
    try {
      results.push(...(await fetchMlbPickResults(supabase, mlbExternalIds)));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  results.sort((a, b) => b.game_date.localeCompare(a.game_date));

  return NextResponse.json(results);
}

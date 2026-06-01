import { type NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_SCORING_RULE, assertSelectOk } from '@moneyball/shared';

export const dynamic = 'force-dynamic';

export interface PickGameResult {
  id: number;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_team: { id: number; name_ko: string | null; code: string | null } | null;
  away_team: { id: number; name_ko: string | null; code: string | null } | null;
  ai_predicted_winner_id: number | null;
  ai_confidence: number | null;
  ai_is_correct: boolean | null;
  /**
   * factors map (cycle 1021 c9) — per-factor home-win prob [0,1] (0.5=중립).
   * pre_game + CURRENT_SCORING_RULE row 만 pick. null = pre_game prediction 미생성
   * or factors 비어있음 / scoring_rule mismatch.
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

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids');
  if (!raw) return NextResponse.json([] as PickGameResult[]);

  const ids = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, 200); // 상한 보호

  if (ids.length === 0) return NextResponse.json([] as PickGameResult[]);

  const supabase = await createClient();

  // cycle 1021 c9: predictions 안 factors + prediction_type + scoring_rule 추가 select.
  // server-side 에서 pre_game + CURRENT_SCORING_RULE row 만 pick (shadow row 차단).
  const result = await supabase
    .from('games')
    .select(
      `id, game_date, home_score, away_score, status,
       home_team:home_team_id ( id, name_ko, code ),
       away_team:away_team_id ( id, name_ko, code ),
       predictions ( predicted_winner, confidence, is_correct, factors, prediction_type, scoring_rule )`,
    )
    .in('id', ids)
    .order('game_date', { ascending: false });

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

  const results: PickGameResult[] = (data ?? []).map((g) => {
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

    return {
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
    };
  });

  return NextResponse.json(results);
}

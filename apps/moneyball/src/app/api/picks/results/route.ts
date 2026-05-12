import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  const { data, error } = await supabase
    .from('games')
    .select(
      `id, game_date, home_score, away_score, status,
       home_team:home_team_id ( id, name_ko, code ),
       away_team:away_team_id ( id, name_ko, code ),
       predictions ( predicted_winner, confidence, is_correct )`,
    )
    .in('id', ids)
    .order('game_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: PickGameResult[] = (data ?? []).map((g) => {
    const pred = Array.isArray(g.predictions) ? g.predictions[0] : g.predictions;
    return {
      id: g.id,
      game_date: g.game_date,
      home_score: g.home_score,
      away_score: g.away_score,
      status: g.status,
      home_team: Array.isArray(g.home_team) ? g.home_team[0] : g.home_team,
      away_team: Array.isArray(g.away_team) ? g.away_team[0] : g.away_team,
      ai_predicted_winner_id: pred?.predicted_winner ?? null,
      ai_confidence: pred?.confidence ?? null,
      ai_is_correct: pred?.is_correct ?? null,
    };
  });

  return NextResponse.json(results);
}

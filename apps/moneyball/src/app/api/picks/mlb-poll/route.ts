import { type NextRequest, NextResponse } from 'next/server';
import { PICKS_POLL_IDS_LIMIT, assertSelectOk } from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface MlbPickPollEntry {
  home: number;
  away: number;
  total: number;
}

type MlbPickPollResult = Record<string, MlbPickPollEntry>;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids');
  if (!raw) return NextResponse.json({} as MlbPickPollResult);

  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 20)
    .slice(0, PICKS_POLL_IDS_LIMIT);

  if (ids.length === 0) return NextResponse.json({} as MlbPickPollResult);

  const supabase = await createClient();

  const selectResult = await supabase
    .from('mlb_pick_poll_events')
    .select('external_game_id, pick')
    .in('external_game_id', ids);

  let data;
  try {
    ({ data } = assertSelectOk(selectResult, 'picks.mlbPoll.getPollEvents'));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  const result: MlbPickPollResult = {};
  for (const id of ids) {
    result[id] = { home: 0, away: 0, total: 0 };
  }

  for (const row of data ?? []) {
    const entry = result[row.external_game_id];
    if (!entry) continue;
    if (row.pick === 'home') {
      entry.home++;
      entry.total++;
    } else if (row.pick === 'away') {
      entry.away++;
      entry.total++;
    }
  }

  return NextResponse.json(result);
}

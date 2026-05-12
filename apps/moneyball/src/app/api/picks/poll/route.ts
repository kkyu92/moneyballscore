import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface PickPollEntry {
  home: number;
  away: number;
  total: number;
}

export type PickPollResult = Record<number, PickPollEntry>;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids');
  if (!raw) return NextResponse.json({} as PickPollResult);

  const ids = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, 50);

  if (ids.length === 0) return NextResponse.json({} as PickPollResult);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pick_poll_events')
    .select('game_id, pick')
    .in('game_id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: PickPollResult = {};
  for (const id of ids) {
    result[id] = { home: 0, away: 0, total: 0 };
  }

  for (const row of data ?? []) {
    const entry = result[row.game_id];
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

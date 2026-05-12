import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('game_id' in body) ||
    !('pick' in body) ||
    !('device_id' in body)
  ) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const { game_id, pick, device_id } = body as Record<string, unknown>;

  if (typeof game_id !== 'number' || !Number.isInteger(game_id) || game_id <= 0) {
    return NextResponse.json({ error: 'invalid game_id' }, { status: 400 });
  }
  if (pick !== 'home' && pick !== 'away') {
    return NextResponse.json({ error: 'invalid pick' }, { status: 400 });
  }
  if (typeof device_id !== 'string' || device_id.length === 0 || device_id.length > 64) {
    return NextResponse.json({ error: 'invalid device_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('pick_poll_events')
    .upsert(
      { game_id, pick, device_id, picked_at: new Date().toISOString() },
      { onConflict: 'device_id,game_id' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

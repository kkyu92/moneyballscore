import { type NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { DB_CONSTRAINTS } from '@moneyball/kbo-data';
import { DEVICE_ID_MAX_LENGTH } from '@moneyball/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOriginAllowed } from '@/lib/api/is-origin-allowed';

export const dynamic = 'force-dynamic';

// pick_poll_events(025) 의 game_id 는 INT REFERENCES games(id) — KBO 전용.
// MLB 는 external_game_id VARCHAR(20) (mlb_schedule, migration 038) 이라 타입이
// 안 맞아 별도 테이블(048 mlb_pick_poll_events) + 별도 route 로 parity 확보.
export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('external_game_id' in body) ||
    !('pick' in body) ||
    !('device_id' in body)
  ) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const { external_game_id, pick, device_id } = body as Record<string, unknown>;

  if (
    typeof external_game_id !== 'string' ||
    external_game_id.length === 0 ||
    external_game_id.length > 20
  ) {
    return NextResponse.json({ error: 'invalid external_game_id' }, { status: 400 });
  }
  if (pick !== 'home' && pick !== 'away') {
    return NextResponse.json({ error: 'invalid pick' }, { status: 400 });
  }
  if (typeof device_id !== 'string' || device_id.length === 0 || device_id.length > DEVICE_ID_MAX_LENGTH) {
    return NextResponse.json({ error: 'invalid device_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('mlb_pick_poll_events')
    .upsert(
      { external_game_id, pick, device_id, picked_at: new Date().toISOString() },
      { onConflict: DB_CONSTRAINTS.mlbPickPollEvents },
    );

  if (error) {
    Sentry.captureException(error, {
      tags: { layer: 'api-route', route: 'mlb-picks-submit', pick },
      extra: { external_game_id, message: error.message },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { DB_CONSTRAINTS } from '@moneyball/kbo-data';
import { NICKNAME_MIN_CHARS, NICKNAME_MAX_CHARS } from '@moneyball/shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOriginAllowed } from '@/lib/api/is-origin-allowed';
import { isValidNickname, isValidDeviceId } from '@/lib/api/leaderboard-sync-validation';
import type { MlbLeaderboardSyncPayload } from '@/lib/leaderboard/types';

// sync/route.ts (KBO) 의 external_game_id 버전 — mlb_user_picks(050) 는
// game_id INT REFERENCES games(id) 대신 external_game_id VARCHAR(20) REFERENCES
// mlb_schedule(external_game_id) 라 별도 route 필요 (048 과 동일 분리 사유).

export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: MlbLeaderboardSyncPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { device_id, nickname, picks } = body;

  if (!isValidDeviceId(device_id)) {
    return NextResponse.json({ error: 'invalid device_id' }, { status: 400 });
  }
  if (!isValidNickname(nickname)) {
    return NextResponse.json({ error: `nickname must be ${NICKNAME_MIN_CHARS}~${NICKNAME_MAX_CHARS} chars` }, { status: 400 });
  }
  if (!Array.isArray(picks) || picks.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const rows = picks
    .filter(
      (p) =>
        typeof p.external_game_id === 'string' &&
        p.external_game_id.length > 0 &&
        p.external_game_id.length <= 20 &&
        (p.pick === 'home' || p.pick === 'away') &&
        typeof p.picked_at === 'string'
    )
    .map((p) => ({
      device_id,
      nickname: nickname.trim(),
      external_game_id: p.external_game_id,
      pick: p.pick,
      picked_at: p.picked_at,
    }));

  if (rows.length === 0) return NextResponse.json({ synced: 0 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('mlb_user_picks')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbUserPicks, ignoreDuplicates: false });

  if (error) {
    Sentry.captureException(error, {
      tags: { layer: 'api-route', route: 'mlb-leaderboard-sync' },
      extra: { rows_count: rows.length, message: error.message },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}

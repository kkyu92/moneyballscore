import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LeaderboardSyncPayload } from '@/lib/leaderboard/types';

// 닉네임 검증: 2~12자, 기본 XSS 방지
function isValidNickname(n: string): boolean {
  if (typeof n !== 'string') return false;
  const trimmed = n.trim();
  if (trimmed.length < 2 || trimmed.length > 12) return false;
  if (/<|>|&|"|'|`/.test(trimmed)) return false;
  return true;
}

function isValidDeviceId(id: string): boolean {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id);
}

export async function POST(req: NextRequest) {
  let body: LeaderboardSyncPayload;
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
    return NextResponse.json({ error: 'nickname must be 2~12 chars' }, { status: 400 });
  }
  if (!Array.isArray(picks) || picks.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const rows = picks
    .filter(
      (p) =>
        typeof p.game_id === 'number' &&
        (p.pick === 'home' || p.pick === 'away') &&
        typeof p.picked_at === 'string'
    )
    .map((p) => ({
      device_id,
      nickname: nickname.trim(),
      game_id: p.game_id,
      pick: p.pick,
      picked_at: p.picked_at,
    }));

  if (rows.length === 0) return NextResponse.json({ synced: 0 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_picks')
    .upsert(rows, { onConflict: 'device_id,game_id', ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}

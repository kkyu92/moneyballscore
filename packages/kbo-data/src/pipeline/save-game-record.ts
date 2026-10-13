/**
 * game_records 테이블 upsert — Naver record 응답을 경기별 JSONB 로 저장.
 * idempotent: UNIQUE(game_id) 기반 conflict 시 갱신.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { assertWriteOk, errMsg } from '@moneyball/shared';
import type { NaverRecord } from '../scrapers/naver-record';
import { DB_CONSTRAINTS } from './db-constraints';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

interface SaveResult {
  gameId: number;
  skipped: boolean; // status BEFORE 등으로 저장 생략
  error: string | null;
}

/**
 * NaverRecord 를 game_records 에 upsert.
 *
 * - `BEFORE` (경기 전) / `CANCEL` 은 skip — boxscore 실질 데이터 없음
 * - `STARTED` / `RESULT` 만 저장 (실시간도 저장 가능, updated_at 갱신됨)
 */
export async function saveGameRecord(
  db: DB,
  gameId: number,
  record: NaverRecord,
): Promise<SaveResult> {
  // statusCode 는 naver-record.ts 기준 문자열 리터럴 (RESULT/STARTED/BEFORE/CANCEL) 만 확인됨.
  const skipStatusStrings = new Set(['BEFORE', 'CANCEL', '']);
  // 실데이터 부재 휴리스틱: pitcher / batter 모두 비면 저장 의미 없음
  const noData =
    record.pitchersHome.length === 0 &&
    record.pitchersAway.length === 0 &&
    record.battersHome.length === 0 &&
    record.battersAway.length === 0;
  if (skipStatusStrings.has(record.statusCode) || noData) {
    return {
      gameId,
      skipped: true,
      error: null,
    };
  }

  const payload = {
    game_id: gameId,
    status_code: record.statusCode,
    score_board: record.scoreBoard,
    pitchers_home: record.pitchersHome,
    pitchers_away: record.pitchersAway,
    batters_home: record.battersHome,
    batters_away: record.battersAway,
    pitching_result: record.pitchingResult,
    game_info: record.gameInfo,
    raw: record.raw,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // cycle 170 — game_records upsert assertWriteOk 통일 (write 측 silent drift
  // family). throw → return SaveResult 패턴 깨짐 방지 위해 try/catch wrap 으로 기존
  // error return 로직 유지. row null 가드 (RLS 등으로 data=[] error=null 케이스) 는
  // upsert 가 실제로 행을 건드렸는지 확인하는 유일한 신호라 유지.
  let data: { game_id: number }[] | null = null;
  try {
    const upsertResult = await db
      .from('game_records')
      .upsert(payload, { onConflict: DB_CONSTRAINTS.savedGames })
      .select('game_id');
    assertWriteOk(upsertResult, 'save-game-record.game_records.upsert');
    data = upsertResult.data as { game_id: number }[] | null;
  } catch (e) {
    return {
      gameId,
      skipped: false,
      error: errMsg(e),
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      gameId,
      skipped: false,
      error: 'save-game-record.game_records.upsert returned no row (RLS or empty select)',
    };
  }
  return {
    gameId,
    skipped: false,
    error: null,
  };
}

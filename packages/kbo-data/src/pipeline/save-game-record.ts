/**
 * game_records 테이블 upsert — Naver record 응답을 경기별 JSONB 로 저장.
 * idempotent: UNIQUE(game_id) 기반 conflict 시 갱신.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { assertWriteOk, errMsg } from '@moneyball/shared';
import type { NaverRecord } from '../scrapers/naver-record';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface SaveResult {
  gameId: number;
  inserted: boolean;
  updated: boolean;
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
  // Naver record statusCode 는 '1'=BEFORE, '2'=STARTED, '3'=종료진행, '4'=RESULT 확정.
  // 문자열 RESULT/STARTED 로 오는 엔드포인트도 있어 두 형식 모두 처리.
  const skipStatusStrings = new Set(['BEFORE', 'CANCEL', '', '1']);
  // 실데이터 부재 휴리스틱: pitcher / batter 모두 비면 저장 의미 없음
  const noData =
    record.pitchersHome.length === 0 &&
    record.pitchersAway.length === 0 &&
    record.battersHome.length === 0 &&
    record.battersAway.length === 0;
  if (skipStatusStrings.has(record.statusCode) || noData) {
    return {
      gameId,
      inserted: false,
      updated: false,
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
  // error return 로직 유지. 추가: row null 가드 (RLS 등으로 data=[] error=null 시
  // wasUpdated=undefined → inserted true 오판정 차단 — error 명시 return).
  let data: { id: number; created_at: string; updated_at: string }[] | null = null;
  try {
    const upsertResult = await db
      .from('game_records')
      .upsert(payload, { onConflict: 'game_id' })
      .select('id, created_at, updated_at');
    assertWriteOk(upsertResult, 'save-game-record.game_records.upsert');
    data = upsertResult.data as { id: number; created_at: string; updated_at: string }[] | null;
  } catch (e) {
    return {
      gameId,
      inserted: false,
      updated: false,
      skipped: false,
      error: errMsg(e),
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      gameId,
      inserted: false,
      updated: false,
      skipped: false,
      error: 'save-game-record.game_records.upsert returned no row (RLS or empty select)',
    };
  }
  const wasUpdated = row.created_at !== row.updated_at;
  return {
    gameId,
    inserted: !wasUpdated,
    updated: wasUpdated,
    skipped: false,
    error: null,
  };
}

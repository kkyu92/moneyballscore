/**
 * DB UNIQUE constraint 컬럼 단일 소스.
 *
 * Supabase upsert `onConflict` 인자에 raw string 을 쓰지 말고 이 상수를 참조.
 * 마이그레이션이 UNIQUE constraint 컬럼을 바꿀 때 이 파일 1곳만 업데이트하면
 * 모든 사용처가 자동 동기화됨.
 *
 * ESLint no-restricted-syntax rule (packages/kbo-data/eslint.config.mjs) 이
 * `onConflict: '<literal>'` 패턴을 CI 에서 차단.
 *
 * 관련 사례: mig 030 (cycle 1013) predictions UNIQUE 키 변경 후
 * postview-daily.ts / live.ts silent drift (cycle 1509 / 1510).
 */
export const DB_CONSTRAINTS = {
  predictions: 'game_id,prediction_type,scoring_rule',
  games: 'league_id,external_game_id',
  teamSeasonStats: 'team_id,season',
  snapshotPitchers: 'player_id,season,captured_at',
  agentMemories: 'team_code,memory_type,content',
  retroBuckets: 'bucket,season',
  savedGames: 'game_id',
  mlbGames: 'external_game_id',
  syncBatterStats: 'player_id,season',
  pickPollEvents: 'device_id,game_id',
  userPicks: 'device_id,game_id',
} as const;

export type DbConstraintKey = keyof typeof DB_CONSTRAINTS;

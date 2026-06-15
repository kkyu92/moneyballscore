import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(resolve(__dirname, '../038_mlb_schedule.sql'), 'utf8');

describe('038_mlb_schedule migration', () => {
  it('mlb_schedule table created with required columns', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS mlb_schedule/);
    expect(SQL).toMatch(/external_game_id/);
    expect(SQL).toMatch(/home_team_code/);
    expect(SQL).toMatch(/away_team_code/);
    expect(SQL).toMatch(/game_datetime_utc/);
  });

  it('external_game_id UNIQUE constraint', () => {
    expect(SQL).toMatch(/external_game_id.*UNIQUE/);
  });

  it('predictions MLB 확장 컬럼 3개 추가', () => {
    expect(SQL).toMatch(/external_game_id.*VARCHAR\(20\)/);
    expect(SQL).toMatch(/home_win_prob.*FLOAT/);
    expect(SQL).toMatch(/mlb_game_date.*DATE/);
  });

  it('MLB unique index WHERE external_game_id IS NOT NULL', () => {
    expect(SQL).toMatch(/idx_predictions_mlb_unique/);
    expect(SQL).toMatch(/WHERE external_game_id IS NOT NULL/);
  });

  it('game_date index for query performance', () => {
    expect(SQL).toMatch(/idx_mlb_schedule_game_date/);
  });
});

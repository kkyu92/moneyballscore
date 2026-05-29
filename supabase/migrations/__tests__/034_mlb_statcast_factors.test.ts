// supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 034 — Statcast 4 + UTC datetime SQL smoke', () => {
  const sql = readFileSync(
    join(__dirname, '..', '034_mlb_statcast_factors.sql'),
    'utf-8',
  );

  const statcastCols = [
    'home_lineup_xwoba', 'away_lineup_xwoba',
    'home_lineup_barrel_pct', 'away_lineup_barrel_pct',
    'home_lineup_hard_hit_pct', 'away_lineup_hard_hit_pct',
    'home_lineup_launch_angle', 'away_lineup_launch_angle',
  ];

  it.each(statcastCols)('predictions adds %s column', (col) => {
    expect(sql).toMatch(new RegExp(`ADD COLUMN ${col}\\s+DECIMAL`, 'i'));
  });

  it('xwoba range constraint 0~0.5', () => {
    expect(sql).toMatch(/CHECK.*xwoba.*0.*0\.5/s);
  });

  it('barrel_pct range constraint 0~30', () => {
    expect(sql).toMatch(/CHECK.*barrel_pct.*0.*30/s);
  });

  it('games adds game_datetime_utc TIMESTAMPTZ NOT NULL (after backfill)', () => {
    expect(sql).toMatch(/ADD COLUMN game_datetime_utc TIMESTAMPTZ/);
    expect(sql).toMatch(/ALTER COLUMN game_datetime_utc SET NOT NULL/);
  });

  it('backfill UPDATE for existing KBO rows', () => {
    expect(sql).toMatch(/UPDATE games\s+SET game_datetime_utc/);
    expect(sql).toMatch(/Asia\/Seoul/);
  });

  it('idx_games_datetime_utc index', () => {
    expect(sql).toMatch(/CREATE INDEX.*idx_games_datetime_utc/);
  });
});

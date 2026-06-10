import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 033 — league column SQL smoke', () => {
  const sql = readFileSync(
    join(__dirname, '..', '033_mlb_league_column.sql'),
    'utf-8',
  );

  const tables = ['predictions', 'pipeline_runs', 'agent_memories',
    'team_season_stats', 'umpire_stats'];

  it.each(tables)('ALTER TABLE %s ADD COLUMN league', (table) => {
    const pattern = new RegExp(
      `ALTER TABLE ${table}\\s+ADD COLUMN league VARCHAR\\(10\\) NOT NULL DEFAULT 'kbo'`,
      'i',
    );
    expect(sql).toMatch(pattern);
  });

  it('5 tables include CHECK constraint', () => {
    const checkCount = (sql.match(/CHECK \(league ~ '\^\[a-z\]\{2,8\}\$'\)/g) ?? []).length;
    expect(checkCount).toBe(5);
  });

  it('does not reference missing tables (cycle 1151 fix)', () => {
    expect(sql).not.toMatch(/ALTER TABLE team_recent_form/);
    expect(sql).not.toMatch(/ALTER TABLE head_to_head/);
    expect(sql).not.toMatch(/ALTER TABLE stadium_stats/);
  });

  it('does not include broken idx_predictions_league_date (cycle 1151 fix, 037 가 corrected version)', () => {
    expect(sql).not.toMatch(/CREATE INDEX.*idx_predictions_league_date/);
  });

  it('team_season_stats index 유지', () => {
    expect(sql).toMatch(/CREATE INDEX.*idx_team_season_stats_league_season_team/);
  });
});

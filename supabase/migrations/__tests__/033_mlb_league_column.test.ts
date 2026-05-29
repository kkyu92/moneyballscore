import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 033 — league column SQL smoke', () => {
  const sql = readFileSync(
    join(__dirname, '..', '033_mlb_league_column.sql'),
    'utf-8',
  );

  const tables = ['predictions', 'pipeline_runs', 'agent_memories',
    'team_season_stats', 'team_recent_form', 'head_to_head',
    'stadium_stats', 'umpire_stats'];

  it.each(tables)('ALTER TABLE %s ADD COLUMN league', (table) => {
    const pattern = new RegExp(
      `ALTER TABLE ${table}\\s+ADD COLUMN league VARCHAR\\(10\\) NOT NULL DEFAULT 'kbo'`,
      'i',
    );
    expect(sql).toMatch(pattern);
  });

  it('all 8 tables include CHECK constraint', () => {
    const checkCount = (sql.match(/CHECK \(league ~ '\^\[a-z\]\{2,8\}\$'\)/g) ?? []).length;
    expect(checkCount).toBe(8);
  });

  it('two indexes for cross-league query', () => {
    expect(sql).toMatch(/CREATE INDEX.*idx_predictions_league_date/);
    expect(sql).toMatch(/CREATE INDEX.*idx_team_season_stats_league_season_team/);
  });
});

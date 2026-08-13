import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(resolve(__dirname, '../046_mlb_team_elo.sql'), 'utf8');

describe('046_mlb_team_elo migration', () => {
  it('mlb_team_elo table created with required columns', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS mlb_team_elo/);
    expect(SQL).toMatch(/team_code\s+VARCHAR\(5\)/);
    expect(SQL).toMatch(/season\s+INT/);
    expect(SQL).toMatch(/elo_rating\s+DECIMAL/);
  });

  it('team_code + season UNIQUE constraint', () => {
    expect(SQL).toMatch(/UNIQUE \(team_code, season\)/);
  });

  it('season index for query performance', () => {
    expect(SQL).toMatch(/idx_mlb_team_elo_season/);
  });

  it('RLS enabled + anon read policy — mlb_schedule 038 사례 24 재발 차단', () => {
    expect(SQL).toMatch(/ALTER TABLE mlb_team_elo ENABLE ROW LEVEL SECURITY/);
    expect(SQL).toMatch(/CREATE POLICY "anon read mlb_team_elo"/);
    expect(SQL).toMatch(/ON mlb_team_elo FOR SELECT/);
  });
});

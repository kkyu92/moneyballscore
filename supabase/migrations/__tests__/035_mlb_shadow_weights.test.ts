import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 035 — shadow_weights SQL smoke', () => {
  const sql = readFileSync(
    join(__dirname, '..', '035_mlb_shadow_weights.sql'),
    'utf-8',
  );

  it('creates shadow_weights table', () => {
    expect(sql).toMatch(/CREATE TABLE shadow_weights/);
  });

  it('has cohort_size CHECK > 0', () => {
    expect(sql).toMatch(/cohort_size_positive.*CHECK.*cohort_size > 0/s);
  });

  it('has brier 0-1 range CHECK', () => {
    expect(sql).toMatch(/brier_range.*CHECK.*brier >= 0.*brier <= 1/s);
  });

  it('UNIQUE (league, model_version)', () => {
    expect(sql).toMatch(/UNIQUE \(league, model_version\)/);
  });

  it('RLS enabled + anon SELECT policy', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?FOR SELECT/);
  });
});

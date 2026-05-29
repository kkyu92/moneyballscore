import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 036 — walk_forward_brier SQL smoke', () => {
  const sql = readFileSync(
    join(__dirname, '..', '036_mlb_walk_forward_brier.sql'),
    'utf-8',
  );

  it('creates walk_forward_brier table', () => {
    expect(sql).toMatch(/CREATE TABLE walk_forward_brier/);
  });

  it('UNIQUE (league, month)', () => {
    expect(sql).toMatch(/UNIQUE \(league, month\)/);
  });

  it('partial index for kill-switch (delta < -0.02)', () => {
    expect(sql).toMatch(/idx_walk_forward_kill_switch.*WHERE delta < -0\.02/s);
  });

  it('RLS enabled + anon SELECT', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?FOR SELECT/);
  });

  it('brier 0-1 range CHECKs on both base + shadow', () => {
    expect(sql).toMatch(/brier_base_range.*CHECK/s);
    expect(sql).toMatch(/brier_shadow_range.*CHECK/s);
  });
});

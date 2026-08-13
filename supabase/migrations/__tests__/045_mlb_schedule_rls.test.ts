import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(resolve(__dirname, '../045_mlb_schedule_rls.sql'), 'utf8');

describe('045_mlb_schedule_rls migration', () => {
  it('mlb_schedule RLS 활성화 (사례 24 — 038 이 빠뜨린 anon read policy 추가)', () => {
    expect(SQL).toMatch(/ALTER TABLE mlb_schedule ENABLE ROW LEVEL SECURITY/);
  });

  it('anon read policy — USING (true) 로 전체 SELECT 허용 (mlb_team_stats 044 패턴 정합)', () => {
    expect(SQL).toMatch(/CREATE POLICY "anon read mlb_schedule"\s*\n\s*ON mlb_schedule FOR SELECT\s*\n\s*USING \(true\)/);
  });
});

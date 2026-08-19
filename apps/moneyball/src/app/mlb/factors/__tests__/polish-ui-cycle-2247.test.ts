import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../../..');

describe('polish-ui cycle 2247 — /mlb/factors Statcast 가중치 배지 emerald 이탈 정정 (brand token 통일)', () => {
  it('KO 페이지: 가중치 배지가 brand 토큰만 사용, emerald 잔존 없음', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/bg-emerald-50 text-emerald-700/);
    const badgeCount = (src.match(/bg-brand-50 text-brand-700 dark:bg-brand-900\/30 dark:text-brand-200/g) ?? [])
      .length;
    expect(badgeCount).toBeGreaterThanOrEqual(2);
  });

  it('EN 미러 페이지: 가중치 배지가 brand 토큰만 사용, emerald 잔존 없음', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/bg-emerald-50 text-emerald-700/);
  });
});

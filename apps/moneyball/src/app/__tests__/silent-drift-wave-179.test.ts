import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 179 — v2-shadow-monitor/page.tsx 사용자 가시 "v1.8" 하드코딩 → CURRENT_SCORING_RULE 단일 source', () => {
  it('v2-shadow-monitor/page.tsx: metadata description 하드코딩 "v1.8 (prod)" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 \(prod\)/);
  });

  it('v2-shadow-monitor/page.tsx: JSX 안 하드코딩 "v1.8 가중치" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 가중치/);
  });

  it('v2-shadow-monitor/page.tsx: JSX 안 하드코딩 "v1.8 real cohort" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 real cohort/);
  });

  it('v2-shadow-monitor/page.tsx: CURRENT_SCORING_RULE import + 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bCURRENT_SCORING_RULE\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });
});

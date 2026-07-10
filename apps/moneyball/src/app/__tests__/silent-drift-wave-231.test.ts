import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SHADOW_SRC = readFileSync(join(__dirname, '../accuracy/shadow/page.tsx'), 'utf-8');
const SITEMAP_SRC = readFileSync(join(__dirname, '../sitemap.ts'), 'utf-8');

describe('silent drift wave 231 — stale cycle/task-ref annotations (cycle 1530)', () => {
  it('shadow page comment does not contain "cycle 1447 n=161"', () => {
    expect(SHADOW_SRC).not.toContain('cycle 1447 n=161');
  });

  it('shadow page metadata description does not contain "cycle 1447 n=161"', () => {
    expect(SHADOW_SRC).not.toContain('cycle 1447 n=161');
  });

  it('shadow page metadata description does not contain "v2.1-B rejected (Brier 0.4635)"', () => {
    expect(SHADOW_SRC).not.toContain('v2.1-B rejected (Brier 0.4635)');
  });

  it('shadow page JSX p-text does not contain "v2.1-B rejected"', () => {
    expect(SHADOW_SRC).not.toContain('v2.1-B rejected');
  });

  it('shadow page h2 does not contain "SHADOW_WEIGHTS (v2.1-B"', () => {
    expect(SHADOW_SRC).not.toContain('SHADOW_WEIGHTS (v2.1-B');
  });

  it('shadow page h2 does not contain "rejected Brier 0.4635"', () => {
    expect(SHADOW_SRC).not.toContain('rejected Brier 0.4635');
  });

  it('sitemap does not contain "Plan B Task 17 (cycle 1162)"', () => {
    expect(SITEMAP_SRC).not.toContain('Plan B Task 17 (cycle 1162)');
  });

  it('sitemap does not contain "plan #7 Step C (cycle 1138)"', () => {
    expect(SITEMAP_SRC).not.toContain('plan #7 Step C (cycle 1138)');
  });

  it('sitemap does not contain "plan #6 Step A (cycle 882~)"', () => {
    expect(SITEMAP_SRC).not.toContain('plan #6 Step A (cycle 882~)');
  });

  it('sitemap does not contain "plan #6 Step B, cycle 883~"', () => {
    expect(SITEMAP_SRC).not.toContain('plan #6 Step B, cycle 883~');
  });

  it('sitemap does not contain "Plan B Tier C+D Task 4 (cycle 1026 ship)"', () => {
    expect(SITEMAP_SRC).not.toContain('Plan B Tier C+D Task 4 (cycle 1026 ship)');
  });

  it('sitemap does not contain "plan #21 Step 1 (cycle 1092 ship)"', () => {
    expect(SITEMAP_SRC).not.toContain('plan #21 Step 1 (cycle 1092 ship)');
  });
});

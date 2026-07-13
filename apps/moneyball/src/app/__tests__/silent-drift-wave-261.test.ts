import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 261 — v2-shadow-monitor description era 리스트 하드코딩 → registry derive (cycle 1568)', () => {
  it('v2-shadow-monitor/page.tsx: 하드코딩 "v2.0-shadow / v2.1-B-shadow / v1.5 / v1.6 / v1.7-revert" 리터럴 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(
      /v2\.0-shadow \/ v2\.1-B-shadow \/ v1\.5 \/ v1\.6 \/ v1\.7-revert/,
    );
  });

  it('v2-shadow-monitor/page.tsx: PRODUCTION_ERA_HISTORY / SHADOW_V20_SCORING_RULE / SHADOW_SCORING_RULE import 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY/);
    expect(src).toMatch(/SHADOW_V20_SCORING_RULE/);
    expect(src).toMatch(/SHADOW_SCORING_RULE/);
  });

  it('v2-shadow-monitor/page.tsx: ERA_COVERAGE_LABEL derive 상수 박제', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/ERA_COVERAGE_LABEL/);
  });
});

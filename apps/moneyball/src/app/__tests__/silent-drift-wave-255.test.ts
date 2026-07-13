import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 255 — BrierTrendChart SR_ORDER 하드코딩 era 리스트 → PRODUCTION_ERA_HISTORY registry (cycle 1559)', () => {
  it('BrierTrendChart.tsx: 하드코딩 ["all", "v1.5", "v1.6", "v1.7-revert", "v1.8"] 배열 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/dashboard/BrierTrendChart.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\["all", "v1\.5", "v1\.6", "v1\.7-revert", "v1\.8"\]/);
  });

  it('BrierTrendChart.tsx: PRODUCTION_ERA_HISTORY import + spread 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/dashboard/BrierTrendChart.tsx'),
      'utf8',
    );
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY/);
    expect(src).toMatch(/\.\.\.PRODUCTION_ERA_HISTORY/);
  });
});
